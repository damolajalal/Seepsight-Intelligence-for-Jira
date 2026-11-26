# Jira ↔ Seepsight identity linking

Status: pairing-code issuance and API redemption/revocation exist in source. The Jira UI controls and deployed end-to-end flow are still pending.

## Identity model

The existing Seepsight application uses Firebase Authentication identities and Firestore company membership. A Firebase UID resolves the user's company workspace, and active company membership is checked before returning company context.

Relevant existing modules in `damolajalal/seepsight`:
- `seepsight/company_store.py`: resolves a Firebase UID to an active company and verifies membership/email.
- `seepsight/firestore_db.py`: server-side Firebase Admin / Firestore access.
- `seepsight/auth.py`: Firebase Authentication sign-in and the authenticated Jira pairing-code panel.
- `seepsight/jira_linking.py`: secure pairing-code issuance.

The Jira app has a different identity system: Atlassian `cloudId` and the signed FIT `principal` (account ID). A Jira project key or user-supplied company name is not a safe tenant identifier.

## Implemented source flow

1. User signs in to Seepsight through the existing Firebase Authentication flow. The app verifies the Firebase ID token, checks revocation and verified email, and re-resolves active company membership.
2. In the authenticated Seepsight sidebar, the user opens **Connect Seepsight to Jira** and generates a one-time code.
3. Seepsight creates a cryptographically random code with a 10-minute expiry and a 60-second issuance cooldown. Only its SHA-256 hash is stored in `_jira_pairing_codes`; the raw code is displayed in the authenticated Streamlit session.
4. The Jira API receives the code in the request body through the planned Custom UI `requestRemote` call. The request's Atlassian identity is extracted from the signed Forge Invocation Token, not from client-supplied fields.
5. The API atomically consumes the pairing document, verifies its expiry and company binding, rechecks Firebase Authentication and active company membership, and creates the link for `cloudId + principal`.
6. The API writes a company audit event, including the signed Jira actor and optional admin impersonation actor.
7. Every protected API request re-resolves the active link and Firebase company membership. Revocation or membership removal invalidates access.

The Jira UI pairing form and live connection status are not yet implemented. No live account link has been created.

## Security requirements

- Pairing codes are single-use, high entropy, short-lived, rate-limited, and stored hashed.
- Never accept `company_id`, Firebase UID, or Atlassian account ID from the Custom UI as proof of identity.
- Validate the Forge FIT against Atlassian JWKS, expected issuer, expected audience, expiry, and trusted Forge app ID.
- Resolve the Atlassian `cloudId` and `principal` from signed UI-module FIT claims.
- Recheck Firebase Authentication and current company membership on every protected request.
- Provide explicit disconnect/revoke functionality and audit the event.
- Do not reuse a Firebase ID token as a permanent Jira integration secret.
- Never store Firebase refresh tokens or service-account credentials in Jira issue fields, Custom UI storage, logs, or Git.
- Avoid sending procurement evidence or personal data to Rovo unless the user is authorised and the specific action needs it.

## Backend and deployment sequence

1. Deploy the separate FastAPI service to Cloud Run with a dedicated runtime identity and Firestore/Firebase Authentication access.
2. Configure the Forge app ID in trusted Cloud Run environment configuration.
3. Add the verified Cloud Run HTTPS hostname to the Forge `remotes` declaration.
4. Wire the Jira Custom UI pairing form, connection status, overview, and disconnect controls using `requestRemote`.
5. Run an end-to-end test with a non-production Seepsight account and Jira development site.
6. Add findings and evidence endpoints only after detector payloads are normalised and tenant isolation tests pass.

## Current boundary

The existing Streamlit Seepsight app remains separate and unchanged outside its new account-linking panel. The API source is implemented but not deployed. No production Jira-to-Seepsight data connection, API hostname, Forge Remote configuration, or live account link exists.
