"""One-time account-pairing redemption and Jira link revocation."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

from google.cloud import firestore

from .tenant import link_document_id


class PairingError(Exception):
    """A pairing code is invalid, expired, consumed, or not eligible."""


def pairing_code_hash(code: str) -> str:
    """Hash a high-entropy pairing code before using it as a document key."""
    normalised = code.strip()
    if len(normalised) < 24 or len(normalised) > 160:
        raise PairingError("The pairing code is invalid or expired.")
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()


def redeem_pairing_code(
    db: Any,
    firebase_auth: Any,
    cloud_id: str,
    account_id: str,
    installation_id: str,
    code: str,
) -> dict:
    """Atomically consume a pairing code and create the Atlassian identity link.

    Seepsight must create documents in _jira_pairing_codes using the SHA-256
    hash of a cryptographically random code. The document must include
    firebase_uid, status='pending', expires_at, and created_at. The raw code
    is shown once to the signed-in Seepsight user and must never be stored.
    """
    code_hash = pairing_code_hash(code)
    pairing_ref = db.collection("_jira_pairing_codes").document(code_hash)
    link_ref = db.collection("_jira_account_links").document(
        link_document_id(cloud_id, account_id)
    )
    transaction = db.transaction()

    @firestore.transactional
    def _consume(txn):
        pairing_snapshot = pairing_ref.get(transaction=txn)
        pairing = pairing_snapshot.to_dict() if pairing_snapshot.exists else None
        if not pairing or pairing.get("status") != "pending":
            raise PairingError("The pairing code is invalid, expired, or already used.")

        expires_at = pairing.get("expires_at")
        if not isinstance(expires_at, datetime):
            raise PairingError("The pairing code is invalid or expired.")
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            raise PairingError("The pairing code is invalid or expired.")

        uid = pairing.get("firebase_uid")
        if not isinstance(uid, str) or not uid.strip():
            raise PairingError("The pairing code is invalid or expired.")

        # A current active link must not be silently replaced by a new identity.
        existing_link = link_ref.get(transaction=txn)
        existing = existing_link.to_dict() if existing_link.exists else {}
        if existing.get("status") == "active":
            raise PairingError("This Jira account is already linked. Disconnect it before linking another account.")

        user_ref = db.collection("users").document(uid)
        user_snapshot = user_ref.get(transaction=txn)
        user = user_snapshot.to_dict() if user_snapshot.exists else {}
        if not user or user.get("uid") != uid:
            raise PairingError("The Seepsight account could not be verified.")

        company_id = user.get("company_id")
        if not isinstance(company_id, str) or not company_id.strip():
            raise PairingError("The Seepsight account has no active company workspace.")
        if pairing.get("company_id") != company_id:
            raise PairingError("The Seepsight company membership changed. Generate a new Jira code.")

        company_ref = db.collection("companies").document(company_id)
        member_ref = company_ref.collection("members").document(uid)
        company_snapshot = company_ref.get(transaction=txn)
        member_snapshot = member_ref.get(transaction=txn)
        company = company_snapshot.to_dict() if company_snapshot.exists else {}
        member = member_snapshot.to_dict() if member_snapshot.exists else {}

        if company.get("status") != "active" or member.get("status") != "active":
            raise PairingError("The Seepsight company membership is inactive.")
        if member.get("uid") != uid:
            raise PairingError("The Seepsight company membership could not be verified.")

        user_email = str(user.get("email") or "").strip().lower()
        member_email = str(member.get("email") or "").strip().lower()
        if not user_email or user_email != member_email:
            raise PairingError("The Seepsight company membership could not be verified.")

        try:
            firebase_user = firebase_auth.get_user(uid)
        except Exception as exc:
            raise PairingError("The Seepsight account could not be verified.") from exc
        if getattr(firebase_user, "disabled", False) or not getattr(firebase_user, "email_verified", False):
            raise PairingError("The Seepsight account must be active with a verified email.")
        firebase_email = str(getattr(firebase_user, "email", "") or "").strip().lower()
        if firebase_email != user_email:
            raise PairingError("The Seepsight account email could not be verified.")

        now = datetime.now(timezone.utc)
        txn.update(pairing_ref, {
            "status": "consumed",
            "consumed_at": now,
            "consumed_by_cloud_id": cloud_id,
            "consumed_by_account_id": account_id,
        })
        txn.set(link_ref, {
            "firebase_uid": uid,
            "company_id": company_id,
            "status": "active",
            "cloud_id": cloud_id,
            "account_id": account_id,
            "installation_id": installation_id,
            "linked_at": now,
            "linked_by": account_id,
        })
        audit_ref = company_ref.collection("audit_events").document()
        txn.set(audit_ref, {
            "event_type": "jira_account_linked",
            "actor_uid": uid,
            "actor_email": user_email,
            "atlassian_cloud_id": cloud_id,
            "atlassian_account_id": account_id,
            "atlassian_installation_id": installation_id,
            "created_at": now,
        })
        return {
            "company_id": company_id,
            "company_name": company.get("name") or "Company",
            "role": member.get("role") or "member",
        }

    return _consume(transaction)


def revoke_jira_link(
    db: Any,
    cloud_id: str,
    account_id: str,
    installation_id: str,
) -> bool:
    """Revoke the current Jira user link and write a company audit event."""
    link_ref = db.collection("_jira_account_links").document(
        link_document_id(cloud_id, account_id)
    )
    transaction = db.transaction()

    @firestore.transactional
    def _revoke(txn):
        link_snapshot = link_ref.get(transaction=txn)
        link = link_snapshot.to_dict() if link_snapshot.exists else {}
        if link.get("status") != "active":
            return False

        uid = link.get("firebase_uid")
        company_id = link.get("company_id")
        if not isinstance(uid, str) or not isinstance(company_id, str):
            raise PairingError("The linked account record is invalid.")

        user_snapshot = db.collection("users").document(uid).get(transaction=txn)
        user = user_snapshot.to_dict() if user_snapshot.exists else {}
        if user.get("uid") != uid or user.get("company_id") != company_id:
            raise PairingError("The linked Seepsight account could not be verified.")

        company_ref = db.collection("companies").document(company_id)
        company_snapshot = company_ref.get(transaction=txn)
        if not company_snapshot.exists:
            raise PairingError("The linked company workspace could not be verified.")

        now = datetime.now(timezone.utc)
        txn.update(link_ref, {
            "status": "revoked",
            "revoked_at": now,
            "revoked_by_account_id": account_id,
            "revoked_by_installation_id": installation_id,
        })
        audit_ref = company_ref.collection("audit_events").document()
        txn.set(audit_ref, {
            "event_type": "jira_account_link_revoked",
            "actor_uid": uid,
            "atlassian_cloud_id": cloud_id,
            "atlassian_account_id": account_id,
            "atlassian_installation_id": installation_id,
            "created_at": now,
        })
        return True

    return _revoke(transaction)
