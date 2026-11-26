# Seepsight backend integration contract (draft)

Status: proposal only — no live API endpoint or authentication contract has been confirmed.

## What exists today

The existing `damolajalal/seepsight` repository is a Streamlit application. Its current `app.py` configures Streamlit navigation and imports the Seepsight workspace modules. The repository README documents the Streamlit app and a separate Firebase-hosted Hybrid AI companion. This review did not identify a documented public HTTP API for the Jira app to call.

The Jira Forge app must therefore remain in clearly labelled preview mode until a supported backend interface is deliberately implemented and secured. Do not point Forge at the Streamlit page and treat page scraping as an integration.

## Proposed server-to-server API

The following routes are a design proposal, not existing endpoints:

| Method | Proposed route | Purpose |
|---|---|---|
| GET | `/api/v1/jira/health` | Verify backend reachability and integration version |
| GET | `/api/v1/jira/projects/{projectKey}/summary` | Return aggregate procurement exposure and open-work counts |
| GET | `/api/v1/jira/projects/{projectKey}/findings` | Return paginated, evidence-linked findings |
| GET | `/api/v1/jira/projects/{projectKey}/suppliers` | Return supplier risk summaries |
| GET | `/api/v1/jira/projects/{projectKey}/investigations` | Return investigation status and ownership |
| POST | `/api/v1/jira/projects/{projectKey}/actions` | Create a follow-up action after user confirmation |

The backend owner must approve the final route names, versioning, pagination, filtering, error format, and write semantics before implementation.

## Required record shape

Every finding returned to Jira should include:

- Stable finding ID and tenant/workspace ID
- Finding category and concise title
- Severity and status
- Potential exposure amount, currency, and calculation basis (when applicable)
- Detection timestamp and detector/version identifier
- Affected source record identifiers
- Evidence references that resolve only for an authorised user
- Confidence/validation state and known limitations
- Deep link to the canonical Seepsight finding, where available

A Jira view must distinguish potential exposure from confirmed loss, recovered savings, or approved financial amounts.

## Authentication and tenant isolation

- Use a server-to-server credential stored as a Forge environment variable/secret; never put it in Custom UI JavaScript, HTML, logs, or Git.
- Authenticate each Forge request using trusted Forge context and a backend-approved identity mapping.
- Derive tenant/workspace access on the server. Never trust a tenant ID supplied only by the browser.
- Enforce least privilege, tenant isolation, request timeouts, rate limits, and audit logging.
- Add only the confirmed backend hostname to Forge's outbound egress allowlist.
- Do not send raw procurement datasets or unnecessary personal data to Jira or an AI model.

## AI explanation boundary

Gemini explanations must be generated server-side from the specific finding and its authorised evidence references. The explanation must cite the evidence IDs used, preserve numeric values and currency, and explicitly say when evidence is incomplete. The model must not calculate or invent exposure figures.

Rovo integration is a separate Atlassian-native workstream. It must use supported Forge/Rovo interfaces and explicit user permissions; it must not be assumed to have automatic access to Seepsight data.

## Decisions required before connecting

1. Confirm whether a backend API will be added to the existing Seepsight deployment or hosted as a separate service.
2. Approve the API hostname, TLS, authentication method, and credential rotation process.
3. Define Jira site/project to Seepsight tenant/workspace mapping.
4. Approve read and write permissions, including who may create or update Seepsight actions.
5. Confirm which evidence links can be safely opened from Jira and how access is rechecked.
6. Agree retention, audit, and data-minimisation requirements.

Until these decisions are complete, Jira uses sample records only and must display the preview notice.


## Verified source data model (2026-11-26)

A source review of `damolajalal/seepsight` confirmed the tenant and workspace paths documented in [EXISTING_SEEPSIGHT_DATA_MODEL.md](EXISTING_SEEPSIGHT_DATA_MODEL.md).

- Tenant identity resolves from `users/{uid}` to `company_id`, then validates `companies/{company_id}` and `companies/{company_id}/members/{uid}`. Company and member status must both be active, and UID/email consistency is checked.
- Completed analysis metadata is stored at `companies/{company_id}/analyses/{analysis_id}`.
- Findings are stored at `companies/{company_id}/analyses/{analysis_id}/findings/{finding_id}`; findings are detector-defined dictionaries, so a stable API response schema still needs a normalisation layer.
- Dataset records and source records are stored under `companies/{company_id}/datasets/{dataset_id}`.
- A company-scoped `cases` collection and `audit_events` collection exist. The case document field schema and lifecycle have not yet been verified.

The existing Firebase Admin client reads Streamlit secrets, and access verification depends on Streamlit session state. A standalone API must use its own Firebase Admin initialisation (prefer Cloud Run service identity / Application Default Credentials) and must re-check the existing Firestore membership model. It must not import the Streamlit session-dependent access function as its API authorization boundary.

## Recommended implementation boundary

Use a separate Cloud Run API service, leaving the existing Streamlit app unchanged. Start with health, aggregate project summary, and paginated read-only findings. The service should own Firebase Admin initialisation, Atlassian account-link resolution, tenant checks, response normalisation, rate limits, and audit events. Add supplier, case, and write endpoints only after their underlying source schemas and permissions are verified.

This is an architecture recommendation, not an implemented or deployed service. No API hostname, Forge remote, service credential, or live identity link has been configured.
