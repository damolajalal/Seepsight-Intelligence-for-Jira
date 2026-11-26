from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

import app.pairing as pairing


class Snapshot:
    def __init__(self, ref):
        self.exists = ref.value is not None
        self._value = ref.value

    def to_dict(self):
        return self._value


class Document:
    def __init__(self, value=None, children=None):
        self.value = value
        self.children = children or {}

    def get(self, transaction=None):
        return Snapshot(self)

    def collection(self, name):
        return self.children.setdefault(name, Collection({}))


class Collection:
    def __init__(self, documents):
        self.documents = documents

    def document(self, key=None):
        if key is None:
            key = f"audit-{len(self.documents)}"
        return self.documents.setdefault(key, Document())


class Transaction:
    def update(self, ref, values):
        ref.value.update(values)

    def set(self, ref, values):
        ref.value = values


class FakeDb:
    def __init__(self, code_hash, code):
        uid = "firebase-user"
        member = Document({
            "uid": uid,
            "email": "owner@example.com",
            "role": "owner",
            "status": "active",
        })
        company = Document(
            {"name": "Example Co", "status": "active"},
            {"members": Collection({uid: member}), "audit_events": Collection({})},
        )
        self.collections = {
            "_jira_pairing_codes": Collection({
                code_hash: Document({
                    "firebase_uid": uid,
                    "company_id": "company-1",
                    "email": "owner@example.com",
                    "status": "pending",
                    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
                })
            }),
            "_jira_account_links": Collection({}),
            "users": Collection({
                uid: Document({
                    "uid": uid,
                    "email": "owner@example.com",
                    "company_id": "company-1",
                })
            }),
            "companies": Collection({"company-1": company}),
        }

    def collection(self, name):
        return self.collections.setdefault(name, Collection({}))

    def transaction(self):
        return Transaction()


class FakeFirebaseAuth:
    def get_user(self, uid):
        assert uid == "firebase-user"
        return SimpleNamespace(
            disabled=False,
            email_verified=True,
            email="owner@example.com",
        )


def test_pairing_redemption_consumes_code_and_creates_tenant_link(monkeypatch):
    monkeypatch.setattr(pairing.firestore, "transactional", lambda fn: fn)
    code = "one-time-pairing-code-with-strong-random-entropy"
    code_hash = pairing.pairing_code_hash(code)
    db = FakeDb(code_hash, code)

    result = pairing.redeem_pairing_code(
        db,
        FakeFirebaseAuth(),
        "jira-cloud",
        "jira-account",
        "jira-installation",
        code,
        actor_account_id="admin-actor",
    )

    assert result["company_name"] == "Example Co"
    assert result["role"] == "owner"
    pairing_doc = db.collection("_jira_pairing_codes").document(code_hash).value
    assert pairing_doc["status"] == "consumed"
    link_id = pairing.link_document_id("jira-cloud", "jira-account")
    link = db.collection("_jira_account_links").document(link_id).value
    assert link["firebase_uid"] == "firebase-user"
    assert link["company_id"] == "company-1"
    assert link["status"] == "active"
    audit = db.collection("companies").document("company-1").collection("audit_events")
    assert next(iter(audit.documents.values())).value["atlassian_actor_account_id"] == "admin-actor"


def test_pairing_redemption_rejects_reused_code(monkeypatch):
    monkeypatch.setattr(pairing.firestore, "transactional", lambda fn: fn)
    code = "one-time-pairing-code-with-strong-random-entropy"
    code_hash = pairing.pairing_code_hash(code)
    db = FakeDb(code_hash, code)
    db.collection("_jira_pairing_codes").document(code_hash).value["status"] = "consumed"

    with pytest.raises(pairing.PairingError):
        pairing.redeem_pairing_code(
            db, FakeFirebaseAuth(), "jira-cloud", "jira-account",
            "jira-installation", code,
        )
