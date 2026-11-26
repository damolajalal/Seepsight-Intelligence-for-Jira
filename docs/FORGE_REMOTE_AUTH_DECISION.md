# Forge Remote authentication decision

Last reviewed: 2026-11-26  
Status: selected technical direction for implementation; not yet configured or tested.

## Decision

Use **Atlassian Forge Remote** to call the separate Seepsight API. The Forge backend must use the supported `invokeRemote` API. The API must validate the signed Forge Invocation Token (FIT) on every request using Atlassian's published JWKS.

Do not invent a shared HMAC secret between Forge and Cloud Run as the primary proof of Atlassian origin. Forge already supplies a signed, short-lived invocation token designed for this purpose.

## Request flow

1. A Jira Custom UI calls the Forge bridge `invokeRemote` directly. This is a UI-module invocation, so the signed FIT contains the trusted Jira `cloudId` and invoking Atlassian `principal` (account ID).
2. Forge proxies the request and attaches the FIT. The remote verifies its signature against Atlassian's JWKS, expected issuer `forge/invocation-token`, expected audience equal to the registered Forge app ID, and expiry/time claims.
3. The remote additionally checks that the FIT `app.id` matches the app ID configured from a trusted deployment setting.
4. The remote extracts both `cloudId` and `principal` from the signed FIT. It must ignore any client-supplied account ID, Firebase UID, company ID, or role.
5. The remote resolves the stored link `(cloudId, principal) -> Firebase UID`, then re-reads `users/{uid}`, `companies/{company_id}`, and `companies/{company_id}/members/{uid}` from Firestore. Both company and member must be active and identity/email fields consistent.
6. The remote scopes every query by the verified company ID and writes an audit event for the verified actor and Jira installation context.

## Important security constraints

- The backend must reject missing, invalid, expired, incorrectly-audienced, or incorrectly-issued FITs.
- Pin the expected Forge app ID in trusted service configuration. Never accept the app ID from the token as the source of truth.
- Do not log FITs, OAuth tokens, Firebase tokens, secrets, or raw sensitive procurement evidence.
- Never accept `uid`, `company_id`, `role`, or `accountId` as authoritative from browser-supplied request data.
- Derive the Jira tenant from signed FIT claims, not a URL path or query parameter.
- Bind account links to both `cloudId` and `accountId`; use `installationId` as an installation-level identifier/audit attribute. App reinstall can change installation ID, so account links should not depend solely on it.
- Re-check Firebase user and membership status on every protected API call. Revocation must take effect without waiting for a cached tenant role.
- Add rate limits, bounded pagination, request size limits, timeouts, and audit logging.
- If any route is directly callable from a Custom UI in future, it must independently validate all identity claims and must not trust a body accountId supplied by the browser. The current API scaffold expects direct UI-module FITs with a signed `principal` claim. If calls are later moved to a backend Forge function, redesign the identity handoff explicitly because backend-function FIT context differs and may contain only `cloudId`.

## Cloud Run hosting note

Cloud Run remains the recommended hosting target because it can use a dedicated runtime service account and Application Default Credentials to access Firestore without embedding a service-account key. The service must still validate the Forge FIT at the application layer. Do not assume a Google Cloud Run IAM ID token is automatically available from Forge; the Forge Remote FIT is the intended Atlassian-origin credential.

The service must be configured so that every externally reachable API route passes through FIT validation. Cloud Run ingress/auth settings, domain mapping, and any edge protections must be reviewed before deployment. A public network endpoint is not permission to access the API.

## Account linking

Account linking remains a separate user-consent flow:

1. User signs in to the existing Seepsight web app with Firebase Authentication.
2. Seepsight creates a cryptographically random, single-use, short-lived pairing code and stores only a secure hash plus expiry and the authenticated Firebase UID.
3. User enters the code in the Jira app.
4. The Forge resolver forwards the code together with its trusted Jira context to the API.
5. The API validates FIT, consumes the code atomically, re-checks Firebase membership, and stores the link for `cloudId + accountId`.
6. The UI displays the linked Seepsight company and a disconnect option. Disconnect revokes the mapping and writes an audit event.

Pairing codes must be rate-limited, expire quickly, be single-use, and never appear in logs. Email matching alone is not an account-linking mechanism.

## Source references

- Atlassian [Forge Remote essentials](https://developer.atlassian.com/platform/forge/remote/essentials/) — FIT headers, claims, verification, JWKS, app ID, cloudId, principal, and installation ID.
- Atlassian [Forge bridge invokeRemote](https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/invokeRemote/) — remote endpoint and request flow.
- Google Cloud [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service) — Cloud Run IAM ID token model and runtime identity.

This decision does not mean the remote, API, pairing flow, or deployment has been implemented.
