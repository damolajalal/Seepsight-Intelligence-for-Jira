"""Read-only, company-scoped procurement workspace summaries for Jira."""

from datetime import datetime
from typing import Any

from google.cloud import firestore


class WorkspaceDataError(Exception):
    """Raised when the verified company workspace cannot be read safely."""


def _iso(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    return None


def _analysis_summary(snapshot: Any) -> dict | None:
    if not snapshot.exists:
        return None
    data = snapshot.to_dict() or {}
    if data.get("results_status") != "complete":
        return None
    return {
        "analysis_id": data.get("analysis_id") or snapshot.id,
        "finding_count": int(data.get("finding_count") or 0),
        "results_status": "complete",
        "updated_at": _iso(data.get("updated_at")),
    }


def _audit_read(
    company_ref: Any,
    identity: Any,
    event_type: str,
    metadata: dict,
) -> None:
    """Persist a minimal audit record before returning workspace information."""
    company_ref.collection("audit_events").document().set({
        "event_type": event_type,
        "actor_type": "atlassian",
        "atlassian_cloud_id": identity.cloud_id,
        "atlassian_account_id": identity.account_id,
        "atlassian_actor_account_id": identity.actor_account_id,
        "atlassian_installation_id": identity.installation_id,
        "created_at": firestore.SERVER_TIMESTAMP,
        "metadata": metadata,
    })


def get_overview(db: Any, membership: dict, identity: Any) -> dict:
    company_ref = db.collection("companies").document(membership["company_id"])
    company_snapshot = company_ref.get()
    if not company_snapshot.exists:
        raise WorkspaceDataError("The linked company workspace could not be found.")
    company = company_snapshot.to_dict() or {}

    latest_id = company.get("latest_analysis_id")
    latest = None
    if isinstance(latest_id, str) and latest_id.strip():
        analysis_snapshot = company_ref.collection("analyses").document(latest_id).get()
        latest = _analysis_summary(analysis_snapshot)

    _audit_read(
        company_ref,
        identity,
        "jira.overview_read",
        {"has_completed_analysis": latest is not None},
    )
    return {
        "company_name": membership["company_name"],
        "role": membership["role"],
        "latest_analysis": latest,
    }


def list_analyses(db: Any, membership: dict, identity: Any, limit: int = 20) -> dict:
    if not isinstance(limit, int) or limit < 1 or limit > 50:
        raise ValueError("limit must be between 1 and 50.")

    company_ref = db.collection("companies").document(membership["company_id"])
    snapshots = (
        company_ref.collection("analyses")
        .where("results_status", "==", "complete")
        .limit(100)
        .stream()
    )

    analyses = []
    for snapshot in snapshots:
        summary = _analysis_summary(snapshot)
        if summary:
            analyses.append(summary)

    analyses.sort(key=lambda item: item.get("updated_at") or "", reverse=True)
    selected = analyses[:limit]

    _audit_read(
        company_ref,
        identity,
        "jira.analyses_list_read",
        {"returned_count": len(selected)},
    )
    return {"analyses": selected, "returned_count": len(selected)}
