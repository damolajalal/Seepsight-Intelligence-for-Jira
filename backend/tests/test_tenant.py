from types import SimpleNamespace

import pytest

from app.tenant import (
    TenantAccessError,
    link_document_id,
    resolve_active_membership,
)


class Snapshot:
    def __init__(self, value=None):
        self.value = value
        self.exists = value is not None

    def to_dict(self):
        return self.value


class Document:
    def __init__(self, value=None, children=None):
        self.value = value
        self.children = children or {}

    def get(self):
        return Snapshot(self.value)

    def collection(self, name):
        return Collection(self.children.get(name, {}))


class Collection:
    def __init__(self, documents):
        self.documents = documents

    def document(self, key):
        return self.documents.get(key, Document())


class FakeDb:
    def __init__(self, docs):
        self.docs = docs

    def collection(self, name):
        return Collection(self.docs.get(name, {}))


class FakeAuth:
    def __init__(self, user):
        self.user = user

    def get_user(self, uid):
        assert uid == "firebase-uid"
        return self.user


def valid_db():
    uid = "firebase-uid"
    cloud = "jira-cloud"
    account = "jira-account"
    link_id = link_document_id(cloud, account)
    return FakeDb({
        "_jira_account_links": {
            link_id: Document({"firebase_uid": uid, "status": "active"})
        },
        "users": {
            uid: Document({"uid": uid, "email": "owner@example.com", "company_id": uid})
        },
        "companies": {
            uid: Document(
                {"name": "Example Company", "status": "active"},
                {"members": {
                    uid: Document({
                        "uid": uid,
                        "email": "owner@example.com",
                        "role": "owner",
                        "status": "active",
                    })
                }},
            )
        },
    })


def test_resolves_only_active_linked_membership():
    auth = FakeAuth(SimpleNamespace(
        disabled=False,
        email_verified=True,
        email="owner@example.com",
    ))
    membership = resolve_active_membership(
        valid_db(), auth, "jira-cloud", "jira-account"
    )
    assert membership["company_name"] == "Example Company"
    assert membership["company_id"] == "firebase-uid"
    assert membership["role"] == "owner"


def test_rejects_missing_link():
    auth = FakeAuth(SimpleNamespace(
        disabled=False,
        email_verified=True,
        email="owner@example.com",
    ))
    with pytest.raises(TenantAccessError):
        resolve_active_membership(valid_db(), auth, "another-cloud", "jira-account")


def test_rejects_inactive_member():
    db = valid_db()
    company = db.docs["companies"]["firebase-uid"]
    company.children["members"].documents["firebase-uid"].value["status"] = "disabled"
    auth = FakeAuth(SimpleNamespace(
        disabled=False,
        email_verified=True,
        email="owner@example.com",
    ))
    with pytest.raises(TenantAccessError):
        resolve_active_membership(db, auth, "jira-cloud", "jira-account")
