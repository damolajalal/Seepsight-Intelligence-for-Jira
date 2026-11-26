# Seepsight Jira API scaffold

This is a separate FastAPI service intended for deployment to Google Cloud Run. It does not modify or import the existing Streamlit application.

## Current scope

Implemented in this scaffold:

- Atlassian Forge Invocation Token (FIT) signature and claim validation.
- Trusted identity extraction from the signed Jira UI invocation (`cloudId`, `principal`, installation ID).
- Firebase Authentication and Firestore re-validation of linked users and active company membership.
- A safe liveness endpoint, linked-account context endpoint, account pairing/revocation routes, and audited overview/analysis summary routes.
- Audited read-only company overview and completed-analysis summary endpoints with bounded results.
- Unit tests for FIT claim checks and tenant isolation.

Not implemented yet:

- Jira Custom UI pairing-code entry and disconnect controls.
- Live end-to-end pairing against deployed Cloud Run and production Firestore.
- Detailed findings/supplier/case endpoints or detector-specific finding normalisation.
- Audit events for linked-account context reads; overview and analysis-list reads are already audited.
- A configured Forge Remote hostname, Forge manifest remote, app ID, or Cloud Run deployment.

Until a Seepsight-issued pairing code is redeemed, `GET /api/v1/jira/context` correctly returns 403 for users without an active link.

## Local development

Use Python 3.12 or later.

```bash
cd backend
python -m venv .venv
# Activate the virtual environment for your shell.
python -m pip install -r requirements.txt
PYTHONPATH=. python -m pytest -q
```

For local API startup, configure Firebase Application Default Credentials and the registered Forge app ID:

```bash
export FORGE_APP_ID="YOUR_REGISTERED_FORGE_APP_ID"
export GOOGLE_APPLICATION_CREDENTIALS="/secure/path/to/service-account.json"
uvicorn app.main:app --reload
```

Do not commit the service-account file or paste credentials into chat. On Cloud Run, prefer the service's attached runtime identity and Application Default Credentials instead of a downloaded key.

## Required environment

| Variable | Required | Purpose |
|---|---|---|
| `FORGE_APP_ID` | Yes for protected routes | Trusted registered Forge app ID used as expected FIT audience and app identity |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local only when ADC is not otherwise configured | Local Firebase Admin / Firestore credentials |
| `PORT` | Cloud Run supplies it | HTTP listen port; defaults to 8080 in the container |

The commercial Forge JWKS URL and issuer are configured in `app/forge_auth.py`. Isolated Cloud deployments need a separately reviewed JWKS configuration before support is claimed.

## Deployment security gate

Forge sends a signed FIT, not a Google Cloud Run IAM ID token. The Cloud Run service therefore needs an ingress/auth configuration that permits Forge to reach the HTTPS endpoint, while **every protected application route validates the FIT**. Do not treat public network reachability as authorization. The only unauthenticated route in this scaffold is `/healthz`, which returns static non-sensitive liveness information.

Before deployment, review Cloud Run ingress, TLS/domain configuration, rate limits, request size limits, logs, monitoring, and the exact Forge Remote manifest declaration. Do not add the remote hostname to the Forge manifest until the API host is actually deployed and verified.


## Account linking endpoints

- `POST /api/v1/jira/link` accepts a short-lived pairing code issued by the authenticated Seepsight sidebar. It validates the Forge FIT, consumes the pairing code transactionally, revalidates the current Firebase user/company/member records, and creates the Atlassian identity link.
- `DELETE /api/v1/jira/link` revokes the current signed Jira identity link and writes a company audit event.
- `GET /api/v1/jira/context` returns the linked company display context or 403 when no active link exists.
- `GET /api/v1/jira/overview` returns the latest completed analysis summary.
- `GET /api/v1/jira/analyses?limit=20` returns a bounded list of completed analysis summaries. Raw detector finding payloads are not returned.

The existing Seepsight application now contains the pairing-code issuer. See [its linking guide](https://github.com/damolajalal/seepsight/blob/main/docs/JIRA_ACCOUNT_LINKING.md).

These endpoints are source-scaffolded only. They require Cloud Run deployment, Forge Remote configuration, and Jira UI integration before they can be used.


## Browser-to-remote transport

The intended frontend transport is Atlassian's `requestRemote` bridge API. It sends a signed FIT but bypasses the Forge proxy and does not send Atlassian OAuth tokens. The API therefore has a restricted CORS allowlist for Jira Cloud tenant origins and still requires FIT validation on every protected request. The Forge manifest's `remotes` entry and the frontend call will be added only after the Cloud Run HTTPS hostname is deployed and verified.
