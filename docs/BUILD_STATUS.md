# Jira app build register

Last updated: 2026-11-26

This register is separate from the existing Seepsight platform's master issue register.

## Implemented in repository

- [x] Correct repository initialised and main branch verified.
- [x] Forge project page and issue panel module declarations.
- [x] Custom UI build directories and HTML/CSS entry points.
- [x] Forge resolver for health, project context, and issue details.
- [x] Dashboard preview navigation for Overview, Investigations, Findings, Suppliers, and Actions.
- [x] Responsive, accessible client-side filtering for preview tables.
- [x] Sample-only action completion interaction.
- [x] Clear sample-data labels.
- [x] GitHub Actions workflow added for Node.js 24, production dependency audit, unit tests, Custom UI bundling, and Forge lint.

## Blocked on Atlassian environment

- [ ] Create a scoped Atlassian Forge API token (never commit or share it).
- [ ] Forge CLI authentication.
- [ ] Register app and replace placeholder app ID.
- [x] Confirm CI can install dependencies and generate both UI bundles.
- [ ] Confirm the latest GitHub Actions run passes dependency reporting, tests, and UI build after the table-filter update.
- [ ] Optionally add `FORGE_EMAIL` and `FORGE_API_TOKEN` as GitHub Actions secrets to enable authenticated Forge lint; otherwise run lint after logging in locally.
- [ ] Deploy to development environment.
- [ ] Install on Jira Cloud development/demo site.
- [ ] Verify project page and issue panel in Jira.

## Integration backlog

- [x] Inspect the existing Seepsight repository; no documented public HTTP API was identified in its Streamlit entry point/README.
- [x] Confirm the existing Seepsight tenant model uses Firebase UID and Firestore company membership; document secure Atlassian-to-Firebase account linking (`docs/IDENTITY_LINKING_DESIGN.md`).
- [x] Draft the proposed secure Seepsight-to-Jira API contract and tenant-isolation requirements (`docs/SEEPSIGHT_INTEGRATION_CONTRACT.md`).
- [x] Inspect and document verified Firestore tenant, analysis, findings, dataset, case-path, and audit-event structures (`docs/EXISTING_SEEPSIGHT_DATA_MODEL.md`).
- [x] Confirm the existing Firestore access helper is Streamlit-session-dependent and must not be reused as standalone API authentication.
- [x] Select Atlassian Forge Remote FIT verification as the Forge-to-API authentication direction and document account-linking safeguards (`docs/FORGE_REMOTE_AUTH_DECISION.md`).
- [x] Add an isolated FastAPI backend scaffold with Cloud Run container definition, Firebase Admin/Firestore tenant revalidation, and health/context routes (`backend/`).
- [x] Add Forge FIT validation against Atlassian JWKS, issuer, expected app audience, and trusted app ID.
- [x] Add Python CI tests for FIT validation and Firestore tenant isolation.
- [ ] Implement Firebase-authenticated pairing-code creation, atomic redemption, and revocation.
- [ ] Deploy the API to Cloud Run with a runtime service identity and verified HTTPS hostname.
- [x] Select Forge Remote FIT verification as the Forge-to-API authentication direction and add its validator scaffold.
- [ ] Configure the Forge Remote endpoint after a real API hostname and registered Forge app ID exist.
- [ ] Implement single-use Atlassian-to-Firebase account linking and live tenant mapping; the API currently denies access when no active link exists.
- [ ] Normalise detector-specific finding dictionaries into a versioned, bounded API response schema.
- [ ] Inspect the actual case/action field schema before implementing case or action endpoints.
- [ ] Add Forge backend egress allowlist for the confirmed Seepsight API host.
- [ ] Connect verified findings, exposure values, supplier records, and investigation data.
- [ ] Add evidence references and traceability for every AI explanation.
- [ ] Add Jira issue creation/comment/action workflows with user confirmation.
- [ ] Integrate Gemini server-side; never place credentials in browser code.
- [x] Research current Forge Rovo Agent/Action capabilities and document a secure evidence-first integration plan (`docs/ROVO_INTEGRATION_PLAN.md`).
- [ ] Implement Rovo Agent and read-only actions after the Seepsight API and tenant permission model are available.
- [ ] Evaluate Teamwork Graph access and usefulness.

## Known limitations / risks

- The Forge app is source-scaffolded but not deployed or runtime-tested. The separate FastAPI service has source and CI tests, but it is not deployed or connected to production Firestore. CI runs unit tests and builds both Custom UI bundles. Forge lint is conditional on optional GitHub Actions secrets because the CLI requires Atlassian authentication.
- The app ID in `manifest.yml` is intentionally a placeholder until Forge registration.
- UI JavaScript bundles are generated during CI by `npm run build:ui`; generated bundles are not committed to the repository.
- All displayed figures and records are illustrative sample content.
- No Seepsight, Gemini, BigQuery, Firebase, NVIDIA NIM, or Rovo connection is active. The existing Seepsight app is Streamlit-based; a supported API must be implemented before Forge can connect safely.
- A production dependency audit found 9 transitive advisories in the current Forge dependency tree (5 high, 4 moderate). The audit did not identify a safe non-breaking automatic fix; do not run `npm audit fix --force` blindly. Track and reassess these upstream advisories before release. CI currently blocks critical-severity findings while retaining the audit output.
- The production dependency audit currently reports 9 transitive advisories (5 high, 4 moderate); the CI audit is informational while upstream dependency updates are assessed. Do not apply `npm audit fix --force` without compatibility testing.
