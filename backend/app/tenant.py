"""Resolve a linked Jira user to an active Seepsight company membership."""

from __future__ import annotations

import hashlib
from typing import Any


class TenantAccessError(Exception):
    """Raised when a Jira identity has no valid Seepsight tenant access."""


def link_document_id(cloud_id: str, account_id: str) -> str:
    """Return a deterministic opaque key for a Jira site/user pair."""
    raw = f"{cloud_id}:{account_id}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _data(snapshot: Any) -> dict:
    return snapshot.to_dict() or {} if snapshot.exists else {}


def resolve_active_membership(db: Any, firebase_auth: Any, cloud_id: str, account_id: str) -> dict:
    """Resolve the link, then re-check Firebase and Firestore membership.

    Expected link storage is a top-level _jira_account_links collection.
    The pairing flow that creates these documents is intentionally a later
    milestone; no link is trusted merely because the document exists.
    """
    link_ref = db.collection("_jira_account_links").document(
        link_document_id(cloud_id, account_id)
    )
    link_snapshot = link_ref.get()
    link = _data(link_snapshot)

    if not link or link.get("status") != "active":
        raise TenantAccessError("This Jira account is not linked to an active Seepsight account.")

    uid = link.get("firebase_uid")
    if not isinstance(uid, str) or not uid.strip():
        raise TenantAccessError("The Jira account link is invalid.")

    try:
        firebase_user = firebase_auth.get_user(uid)
    except Exception as exc:
        raise TenantAccessError("The linked Firebase account could not be verified.") from exc

    if getattr(firebase_user, "disabled", False):
        raise TenantAccessError("The linked Firebase account is disabled.")
    if not getattr(firebase_user, "email_verified", False):
        raise TenantAccessError("The linked Firebase account email is not verified.")

    email = str(getattr(firebase_user, "email", "") or "").strip().lower()
    if not email:
        raise TenantAccessError("The linked Firebase account has no verified email.")

    user_snapshot = db.collection("users").document(uid).get()
    user = _data(user_snapshot)
    if not user or user.get("uid") != uid:
        raise TenantAccessError("The Seepsight user profile could not be verified.")
    if str(user.get("email") or "").strip().lower() != email:
        raise TenantAccessError("The Seepsight user email does not match Firebase Authentication.")

    company_id = user.get("company_id")
    if not isinstance(company_id, str) or not company_id.strip():
        raise TenantAccessError("The Firebase account has no company workspace.")

    company_snapshot = db.collection("companies").document(company_id).get()
    company = _data(company_snapshot)
    member_snapshot = (
        db.collection("companies").document(company_id)
        .collection("members").document(uid).get()
    )
    member = _data(member_snapshot)

    if company.get("status") != "active" or not member:
        raise TenantAccessError("The company workspace or membership is inactive.")
    if member.get("uid") != uid or member.get("status") != "active":
        raise TenantAccessError("The company membership could not be verified.")
    if str(member.get("email") or "").strip().lower() != email:
        raise TenantAccessError("The company membership email does not match Firebase Authentication.")

    return {
        "firebase_uid": uid,
        "company_id": company_id,
        "company_name": company.get("name") or "Company",
        "role": member.get("role") or "member",
        "email": email,
    }
