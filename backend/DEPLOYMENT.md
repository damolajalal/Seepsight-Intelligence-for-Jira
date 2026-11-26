# Cloud Run deployment runbook

Status: instructions only. No Cloud Run service has been deployed.

## Before deployment

1. Register the Forge app exactly once and replace the placeholder app ID in `manifest.yml`.
2. Confirm the Firebase project that owns the current Seepsight Firestore database. Do not assume it is the same project used by another Seepsight service.
3. Confirm the Firestore database location and choose a Cloud Run region close to it, subject to your organisation's data-residency requirements.
4. Create a dedicated Cloud Run runtime service account. Grant only the permissions needed to read/write the Seepsight Firestore collections and look up Firebase Authentication users.
5. Enable Cloud Run, Cloud Build, Artifact Registry, Firestore, and Firebase Authentication APIs for the selected Google Cloud project.
6. Configure a Firestore TTL policy for pairing-code documents (see below).

## Build and deploy

Run these commands from the repository root in an authenticated Google Cloud SDK environment. Replace the uppercase placeholders; do not paste credentials into source control.

```bash
gcloud config set project YOUR_FIREBASE_PROJECT_ID

gcloud run deploy seepsight-jira-api \
  --source backend \
  --region YOUR_CLOUD_RUN_REGION \
  --service-account YOUR_RUNTIME_SERVICE_ACCOUNT \
  --allow-unauthenticated \
  --set-env-vars FORGE_APP_ID=YOUR_REGISTERED_FORGE_APP_ID
```

The service is network-reachable because Forge Remote sends an Atlassian FIT rather than a Google Cloud Run IAM identity token. This is intentional only because every protected API route validates the signed FIT against Atlassian's JWKS, issuer, expected audience, and trusted app ID. Keep `/healthz` non-sensitive. Never add a protected route without FIT validation.

After deployment:

1. Copy the HTTPS service URL from the successful `gcloud run deploy` output.
2. Verify `GET /healthz` returns only the static liveness response.
3. Verify protected routes reject requests without a valid FIT.
4. Configure monitoring, error alerts, request limits, and log redaction. Never log bearer tokens, pairing codes, Firebase tokens, or raw procurement evidence.
5. Update the Forge `remotes` base URL to the verified HTTPS hostname and deploy the Forge app.
6. Test pairing with a non-production Seepsight account and a Jira development site before using production data.

## Firestore pairing-code expiry cleanup

Pairing redemption rejects expired codes even if their documents still exist. To remove expired documents automatically, enable Firestore TTL on the `expires_at` field for the `_jira_pairing_codes` collection group:

```bash
gcloud firestore fields ttls update expires_at \
  --collection-group=_jira_pairing_codes \
  --enable-ttl \
  --project=YOUR_FIREBASE_PROJECT_ID
```

TTL deletion is asynchronous. Application code must continue to check `expires_at`; TTL is storage cleanup, not an authorization control.

## Forge Remote transport

The current design uses `requestRemote` from Custom UI. Add a Forge `remotes` entry with the deployed HTTPS hostname and the appropriate egress operation. The frontend must call the configured remote key. Keep the CORS allowlist limited to the Jira tenant and Forge app iframe origins actually observed in the development site.

If a future feature requires Atlassian REST API calls from the remote, reassess the design and use the documented `invokeRemote` endpoint flow with explicitly scoped app-user/app-system tokens. Do not enable OAuth token forwarding unless it is required.

## Rollback

- Disable the Forge remote calls or uninstall the development app to stop new invocations.
- Revoke active account links through the authenticated Jira disconnect endpoint or mark the link records revoked through a controlled administrative process.
- Do not delete pairing-code or audit collections as a rollback shortcut.
- Preserve audit events and review outstanding links before removing the Cloud Run service.
