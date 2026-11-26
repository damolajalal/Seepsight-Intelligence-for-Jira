# Existing Seepsight data model verified for Jira integration

Last reviewed: 2026-11-26  
Source repository: [damolajalal/seepsight](https://github.com/damolajalal/seepsight)

This document records only structures confirmed in the current Seepsight source. It is a read-only integration reference, not a claim that a Jira API or Cloud Run service exists.

## Tenant identity and membership

The current `seepsight/company_store.py` resolves a Firebase UID through these Firestore documents:

- `users/{uid}` — contains `uid`, verified `email`, and `company_id`.
- `companies/{company_id}` — contains company `name`, `owner_uid`, and `status`.
- `companies/{company_id}/members/{uid}` — contains `uid`, `email`, `role`, and `status`.

The current company bootstrap assigns a user's first company ID to that user's Firebase UID. Membership and company records must both be active. The stored user email and membership email must match, and the member UID must match the authenticated UID.

**Integration rule:** Jira must not supply or choose a Firebase UID or company ID as an authorization claim. The backend must resolve the Atlassian installation/user link to a Firebase UID, then re-read the user, company, and membership records on every protected request. Revoked, disabled, missing, or inconsistent membership must fail closed.

## Procurement workspace data

The current `seepsight/firestore_db.py` confirms the following company-scoped paths:

| Firestore path | Verified purpose |
|---|---|
| `companies/{company_id}/datasets/{dataset_id}` | Dataset metadata |
| `companies/{company_id}/datasets/{dataset_id}/records/{record_id}` | Normalised dataset records |
| `companies/{company_id}/datasets/{dataset_id}/source_records/{record_id}` | Source records |
| `companies/{company_id}/datasets/{dataset_id}/configuration/mapping` | Saved dataset mapping |
| `companies/{company_id}/analyses/{analysis_id}` | Analysis summary/workspace metadata |
| `companies/{company_id}/analyses/{analysis_id}/findings/{finding_id}` | Findings produced by an analysis |
| `companies/{company_id}/analyses/{analysis_id}/revisions/{revision_id}/tables/{table_name}/rows/{row_id}` | Versioned analysis table rows |
| `companies/{company_id}/cases/{case_id}` | Company-scoped case documents (path existence confirmed; case field schema not yet verified) |
| `companies/{company_id}/audit_events/{event_id}` | Company audit events |

Findings are stored under an analysis, with deterministic document IDs such as `finding_000000000000` and an internal `_finding_number` used for ordering. The analysis metadata includes `analysis_id`, `finding_count`, `results_status`, and `updated_at`. The source only returns a completed analysis when its result status is not `saving` or `failed`.

Analysis workspaces are listed only when `workspace_status == "complete"`. The company document may contain `latest_analysis_id`. These are confirmed fields; individual finding payload fields are detector-defined dictionaries and must be inspected/normalised before exposing them in a stable public API.

## Existing authentication boundary

The Streamlit application currently stores its Firebase sign-in context in `st.session_state["seepsight_auth"]`. `verify_company_access()` verifies the Firebase ID token (including revocation), requires a verified email, checks the session UID/email against the token, and then re-resolves active Firestore membership.

The current Firestore client initialisation reads Firebase Admin service-account configuration from Streamlit secrets. That implementation is coupled to Streamlit and must **not** be imported unchanged into a standalone API process.

## API implementation implications

1. Build a separate API service using Firebase Admin with Cloud Run's service identity / Application Default Credentials where possible. If a service-account key is unavoidable, store it in Secret Manager and never commit it.
2. Keep the existing Streamlit application and its authentication/session code unchanged.
3. Implement a backend-owned Atlassian-to-Firebase account link. Pairing must begin from an authenticated Seepsight session and bind a verified Firebase UID to trusted Forge context (Atlassian `cloudId` and `accountId`).
4. On every API request, verify the Forge service request, resolve the stored link, and re-check current Firebase user/company/member status. Never accept `company_id`, `uid`, or `role` from Custom UI request parameters as authority.
5. Expose bounded, paginated, read-only summary/findings endpoints first. Enforce company scoping in repository functions, not in browser filters.
6. Treat the case document path as known but its schema as unknown until the case creation/read/update implementation is located and reviewed. Do not expose cases/actions on the assumption that their fields match the Jira preview.
7. Keep source record IDs and evidence references tenant-scoped. Return only the minimum evidence fields needed for Jira, and require backend authorization when resolving a deep link.
8. Record Jira-originated reads and writes in the company audit trail with the verified actor and Atlassian context. Do not claim an audit event is guaranteed until its write result is confirmed.

## Not yet verified

- A public HTTP API, API hostname, or Cloud Run deployment.
- A stable cross-detector finding schema.
- Case document fields, assignment model, and action lifecycle.
- A supported evidence deep-link route.
- A production-ready Forge-to-API authentication mechanism.
- Any live Jira-to-Firebase account link.

These are explicit implementation gates, not assumptions to fill with mock data.
