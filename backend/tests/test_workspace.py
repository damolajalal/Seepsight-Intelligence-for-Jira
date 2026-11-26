from datetime import datetime, timezone
from types import SimpleNamespace

from app.workspace import get_overview, list_analyses


class Snapshot:
    def __init__(self, value=None, doc_id="doc"):
        self.value = value
        self.exists = value is not None
        self.id = doc_id

    def to_dict(self):
        return self.value


class Document:
    def __init__(self, value=None, children=None):
        self.value = value
        self.children = children or {}
        self.writes = []

    def get(self):
        return Snapshot(self.value)

    def collection(self, name):
        return self.children.setdefault(name, Collection({}))

    def set(self, value):
        self.writes.append(value)


class Collection:
    def __init__(self, documents):
        self.documents = documents

    def document(self, key=None):
        if key is None:
            key = f"audit-{len(self.documents)}"
        return self.documents.setdefault(key, Document())

    def where(self, field, operator, expected):
        assert field == "results_status"
        assert operator == "=="
        return Query([
            snapshot for snapshot in self.documents.values()
            if snapshot.value and snapshot.value.get(field) == expected
        ])


class Query:
    def __init__(self, snapshots):
        self.snapshots = snapshots

    def limit(self, count):
        self.count = count
        return self

    def stream(self):
        return iter(self.snapshots[:self.count])


class FakeDb:
    def __init__(self, company):
        self.company = company

    def collection(self, name):
        assert name == "companies"
        return Collection({"company-1": self.company})


def setup_workspace():
    now = datetime(2026, 11, 26, tzinfo=timezone.utc)
    analyses = Collection({
        "analysis-new": Document({
            "analysis_id": "analysis-new",
            "finding_count": 7,
            "results_status": "complete",
            "updated_at": now,
            "private_raw_payload": "must not leak",
        }),
        "analysis-saving": Document({
            "analysis_id": "analysis-saving",
            "finding_count": 99,
            "results_status": "saving",
        }),
    })
    company = Document({
        "name": "Example",
        "latest_analysis_id": "analysis-new",
    }, {"analyses": analyses, "audit_events": Collection({})})
    identity = SimpleNamespace(
        cloud_id="jira-cloud",
        account_id="jira-account",
        installation_id="jira-install",
    )
    membership = {
        "company_id": "company-1",
        "company_name": "Example",
        "role": "owner",
    }
    return FakeDb(company), membership, identity, company


def test_overview_returns_only_safe_latest_analysis_fields():
    db, membership, identity, company = setup_workspace()
    result = get_overview(db, membership, identity)
    assert result["company_name"] == "Example"
    assert result["latest_analysis"]["finding_count"] == 7
    assert "private_raw_payload" not in result["latest_analysis"]
    assert len(company.children["audit_events"].documents) == 1


def test_analysis_list_excludes_incomplete_and_audits_read():
    db, membership, identity, company = setup_workspace()
    result = list_analyses(db, membership, identity, limit=10)
    assert result["returned_count"] == 1
    assert result["analyses"][0]["analysis_id"] == "analysis-new"
    assert len(company.children["audit_events"].documents) == 1
