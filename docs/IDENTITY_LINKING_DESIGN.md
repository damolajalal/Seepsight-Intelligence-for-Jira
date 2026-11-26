# Jira ↔ Seepsight identity linking design

Status: design proposal; no account-linking flow or API is implemented.

## What the existing Seepsight repository establishes

The current Seepsight application uses Firebase Authentication identities and Firestore company membership. In the existing code, a Firebase UID is used to resolve the user's company workspace, and active membership is checked before returning the company context.

Relevant existing modules in `damolajalal/seepsight`:
- `seepsight/company_store.py`: resolves a Firebase UID to an active company and verifies membership/email.
- `seepsight/firestore_db.py`: server-side Firebase Admin / Firestore access.
- `seepsight/auth.py`: existing Firebase Authentication sign-in and account lifecycle.

The Jira app has a different identity system: Atlassian `cloudId` and `accountId`. A Jira project key or user-supplied company name is not a safe tenant identifier.

## Required account-linking flow

1. A user opens Seepsight Intelligence inside Jira and chooses **Connect Seepsight account**.
2. The user is redirected to the official Seepsight account-linking page and signs in through the existing Firebase Authentication flow.
3. After verifying the Firebase session and active company membership, the Seepsight backend creates a cryptographically random, single-use pairing code with a short expiry (recommended maximum 5 minutes).
4. The user returns to Jira and confirms the pairing. The Forge resolver sends the pairing code to the Seepsight backend over TLS.
5. The backend consumes the code atomically and binds the authenticated Atlassian `cloudId` + `accountId` to the verified Firebase UID + company ID.
6. The backend records the link, consent timestamp, scopes granted, and audit event. The UI displays the linked company/workspace name.
7. Every subsequent request rechecks the link is active and the Firebase company membership is still active. Revocation or membership removal invalidates access.

## Security requirements

- Pairing codes are single-use, high entropy, short-lived, rate-limited, and stored hashed.
- Never accept `company_id`, Firebase UID, or Atlassian account ID from the Custom UI as proof of identity.
- The Forge resolver obtains Atlassian `cloudId` and `accountId` from trusted Forge context.
- The Seepsight backend validates the Forge app request using a documented server-to-server authentication method; do not rely on an unsigned account ID header or a browser-supplied tenant ID.
- The backend performs the mapping and membership lookup server-side for every data request.
- Provide explicit disconnect/revoke functionality and audit the event.
- Do not reuse a Firebase ID token as a permanent Jira integration secret.
- Never store Firebase refresh tokens or service-account credentials in Jira issue fields, Custom UI storage, logs, or Git.
- Avoid sending procurement evidence or personal data to Rovo unless the user is authorised and the specific action needs it.

## Backend integration sequence

1. Add a dedicated HTTPS API service to the existing Seepsight deployment architecture (or a separately secured service) without changing the current Streamlit UI.
2. Reuse the existing Firebase Admin and Firestore membership logic server-side; do not duplicate a weaker company lookup.
3. Implement pairing-code creation, redemption, revocation, and audit records.
4. Add read-only project summary and findings endpoints that resolve company access from the stored identity link.
5. Add server-side request authentication between Forge and the API, with key rotation and request replay protection.
6. Add write endpoints only after read access and audit coverage pass security tests.

## Open decision

Before implementation, choose and verify the hosting target and the Forge-to-backend authentication mechanism. The existing Seepsight repository documents Firebase/Firestore usage and Google Secret Manager support, but that does not by itself prove that a production API endpoint is deployed or that Jira identity linking already exists.
