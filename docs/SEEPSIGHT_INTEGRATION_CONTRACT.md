# Seepsight backend integration contract (draft)

Status: source scaffold implemented; not deployed or connected to production Firestore. The Forge Remote FIT contract is selected and documented.

## What exists today

The existing `damolajalal/seepsight` repository is a Streamlit application. Its current `app.py` configures Streamlit navigation and imports the Seepsight workspace modules. The repository README documents the Streamlit app and a separate Firebase-hosted Hybrid AI companion. This review did not identify a documented public HTTP API for the Jira app to call.

The Jira Forge app must remain in clearly labelled preview mode until the API is deployed, the Forge Remote hostname is configured, and end-to-end tenant isolation is verified. Do not point Forge at the Streamlit page or treat page scraping as an integration.

## API routes implemented in source

| Method | Route | Purpose | Status |
|---|---|---|---|
| GET | `/healthz` | Static non-sensitive liveness check | Implemented; no FIT required |
| GET | `/api/v1/jira/context` | Resolve linked company display context | Implemented; requires valid FIT and active account link |
| POST | `/api/v1/jira/link` | Redeem Seepsight pairing code | Implemented; requires valid FIT and active Firebase membership |
| DELETE | `/api/v1/jira/link` | Revoke current Jira identity link | Implemented; requires valid FIT |
| GET | `/api/v1/jira/overview` | Return latest completed analysis summary | Implemented; audited and company-scoped |
| GET | `/api/v1/jira/analyses?limit=20` | Return bounded newest-first completed analysis summaries | Implemented; audited and company-scoped |

The API source is in `backend/`. These are not live endpoints until the FastAPI service is deployed to Cloud Run and the Forge app is configured with its verified HTTPS hostname.

## Planned API routes

The following routes remain future work, not implemented endpoints:

| Method | Planned route | Purpose |
|---|---|---|
| GET | `/api/v1/jira/findings` | Return paginated, evidence-linked findings after detector schema normalisation |
| GET | `/api/v1/jira/suppliers` | Return supplier risk summaries after supplier data schema review |
| GET | `/api/v1/jira/investigations` | Return investigation status and ownership after case schema review |
| POST | `/api/v1/jira/actions` | Create a follow-up action after user confirmation and permission checks |

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

- Authenticate every remote request with Atlassian's signed Forge Invocation Token (FIT), validating JWKS signature, issuer, audience, expiry, and trusted app ID.
- Use `requestRemote` from the Custom UI; it sends the FIT but does not send Atlassian OAuth tokens. Keep the CORS allowlist restricted to Jira/Forge app origins.
- Resolve `(cloudId, principal)` to a Firebase UID using a one-time pairing code; never trust identity or tenant fields supplied by the browser.
- Derive tenant/workspace access on the server. Never trust a tenant ID supplied only by the browser.
- Enforce least privilege, tenant isolation, request timeouts, rate limits, and audit logging.
- Add only the confirmed backend hostname to Forge's outbound egress allowlist.
- Do not send raw procurement datasets or unnecessary personal data to Jira or an AI model.

## AI explanation boundary

Gemini explanations must be generated server-side from the specific finding and its authorised evidence references. The explanation must cite the evidence IDs used, preserve numeric values and currency, and explicitly say when evidence is incomplete. The model must not calculate or invent exposure figures.

Rovo integration is a separate Atlassian-native workstream. It must use supported Forge/Rovo interfaces and explicit user permissions; it must not be assumed to have automatic access to Seepsight data.

## Decisions required before connecting

1. Deploy the separate FastAPI service to Cloud Run and confirm its HTTPS hostname, region, and runtime service identity.
2. Register the Forge app once, pin its app ID in Cloud Run configuration, and configure the Forge `remotes` entry.
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

Use a separate Cloud Run API service, leaving the existing Streamlit app unchanged. The FastAPI scaffold now owns Firebase Admin initialisation, FIT verification, Atlassian account linking, tenant revalidation, minimal overview/analysis summaries, and audit events. Detailed findings, suppliers, cases, and write endpoints remain blocked until their schemas and permissions are verified.

The API and pairing code issuer exist in source, but no API hostname, Forge remote, Cloud Run deployment, live identity link, or production procurement-data connection has been configured.


## Forge-to-API authentication decision

The selected implementation direction is Atlassian Forge Remote with signed Forge Invocation Token (FIT) verification, rather than a custom shared HMAC credential. The full decision, including trusted resolver context, JWKS validation, tenant checks, Cloud Run notes, and single-use Firebase account pairing, is recorded in [FORGE_REMOTE_AUTH_DECISION.md](FORGE_REMOTE_AUTH_DECISION.md). The FIT validator and requestRemote-compatible CORS policy exist in source; the Forge remote hostname and manifest configuration remain pending Cloud Run deployment.
