# Jira app build register

Last updated: 2026-11-27

This register is separate from the existing Seepsight platform's master issue register.

## Active Forge app scope

The current phase is the standalone Jira Forge experience. API deployment, Cloud Run, Firebase account linking, and live procurement data are deliberately paused until explicitly approved.

## Implemented in repository

- [x] Correct repository initialised and main branch verified.
- [x] Forge project page and issue panel module declarations.
- [x] Custom UI build directories and HTML/CSS entry points.
- [x] Forge resolver for health, project context, and issue details.
- [x] Validate Jira issue keys before making issue requests, including a 255-character upper bound to prevent oversized request paths.
- [x] Convert Jira permission, missing-issue, rate-limit, and service failures into safe user-facing messages.
- [x] Normalise Jira issue responses to an explicit field allowlist and bound returned text.
- [x] Preserve the requested Jira issue key as the canonical displayed key, even if an unexpected response payload contains a different key; covered by a regression test.
- [x] Handle network failures, unreadable JSON responses, and incomplete issue payloads without exposing raw exceptions.
- [x] Add unit coverage for issue-key validation, safe error mapping, response allowlisting, malformed payloads, and text bounds.
- [x] Add security contract tests for least-privilege Jira scopes, current-user issue access, minimal requested fields, safe error handling, test-only bridge mocking, and sample-data disclosures.
- [x] Add a connected sample delivery-variance scenario showing 1,000 ordered units, 800 received, a 200-unit discrepancy, and illustrative ₦4.8M exposure, with an explicit source-document verification warning.
- [x] Dashboard preview navigation for Overview, Investigations, Findings, Suppliers, and Actions.
- [x] Responsive, accessible client-side filtering for preview tables.
- [x] Sample-only action completion interaction.
- [x] Clear sample-data labels.
- [x] GitHub Actions workflow for Node.js 24, production dependency audit, unit tests, complete Custom UI resources, and Chromium interaction tests.
- [x] Forge CI is isolated from the paused Python API scaffold.

## Next Forge app work

- [x] Add cross-linked investigation, finding, supplier, and action detail navigation using clearly labelled sample data.
- [x] Add issue-panel evidence checklist with explicit sample-only labels.
- [x] Show fictional sample source references and the quantity recorded by each document (PO 1,000; delivery confirmation 800; GRN 800), with browser assertions for the provenance details.
- [x] Cross-link the same fictional PO, delivery-confirmation, and GRN references from the investigation/finding detail views, with browser assertions to keep dashboard and issue-panel evidence references consistent.
- [x] Extend the sample reviewer journey from investigation to finding to corrective action, showing linked record IDs, accountable owner, evidence references, required reconciliation step, and explicit closure conditions; browser-tested as one continuous details-dialog workflow.
- [x] Add per-document local review checkboxes, progress indicator, and completion-gated preview review action.
- [x] Add local review toggle with clear no-Jira-write messaging.
- [x] Add issue context loading, warning, and error states, with browser coverage for missing issues, permission denial, and unexpected Jira failures.
- [x] Make dashboard refresh distinguish successful context refreshes from failures, prevent overlapping refresh requests, announce connection-state changes to assistive technology, and keep unexpected resolver exceptions out of console logs.
- [x] Add browser coverage for unexpected Forge health and project resolver failures, including safe UI messaging and preservation of the Jira project key from Forge context.
- [x] Keep unexpected issue-panel resolver exceptions out of browser console output; browser tests verify raw internal error details are absent from both the UI and console.
- [x] Keep the dashboard UI contract aligned with exception-safe resolver handling after raw error logging was removed.
- [x] Add responsive issue-panel styling, keyboard focus treatment, comfortable touch targets, and reduced-motion support.
- [x] Add dashboard and issue-panel narrow-screen layout contract checks; issue-panel loading, warning, and error states are implemented and browser-tested across missing-issue, permission-denied, and unavailable-Jira scenarios.
- [x] Make the UI build copy the current HTML and CSS into Forge resource directories as well as bundling JavaScript, preventing stale deployed UI assets.
- [x] Add Chromium-based dashboard and issue-panel interaction tests to CI for filtering, empty search results, related-record dialog navigation, local action completion, evidence review gating, mobile viewport overflow, visible Jira issue-context fields (summary, key, status, and assignee), missing-issue, permission-denied, unavailable-Jira states, Forge connection status, and failed refresh recovery.
- [ ] Add a true empty-data state when live data is introduced; current sample tables intentionally contain demonstration records.
- [x] Add static UI contract tests for navigation semantics, accessible record dialog, sample-only disclosures, evidence progress semantics, safe DOM rendering, issue-panel touch/motion accessibility, and dashboard skip navigation.
- [x] Add unit tests for evidence review state and completion rules.
- [x] Add a Chromium keyboard interaction check confirming evidence review checkboxes respond to Space and preserve the incomplete-review gate.
- [x] Add unit tests for sample workflow relationship resolution.
- [x] Extract dashboard record filtering into pure helpers with unit coverage.
- [x] Render dashboard table content with safe DOM APIs instead of interpolated HTML.
- [x] Add accessible current-page navigation state and visible keyboard focus for evidence controls.
- [x] Add visible keyboard focus across dashboard controls, responsive search layout, accessible record-dialog focus restoration, an explicit accessible name for the refresh control, and skip navigation to the main landmark.
- [x] Keep the record-details dialog open when following related records, preserving a continuous keyboard review flow.
- [x] Associate the record dialog with its summary text and move initial focus to its labelled close control.
- [x] Keep focus within the dialog when switching related records and restore focus to the current navigation section when closing after a view change.
- [x] Add browser-level UI tests for live DOM interactions using Chromium in GitHub Actions, with a deterministic test-only Forge bridge fixture. The production bundle is built separately without the fixture.
- [ ] Complete final keyboard navigation, focus, and accessible-label review in a live Jira runtime.
- [x] Add a five-minute Codegeist demo runbook with a truthful sample workflow, release checklist, and prohibited unverified integration claims.
- [ ] Review app presentation and demo flow in a live Jira runtime for Codegeist.

## Blocked on Atlassian environment

- [ ] Create a scoped Atlassian Forge API token (never commit or share it).
- [ ] Forge CLI authentication.
- [ ] Register app and replace placeholder app ID.
- [ ] Run authenticated Forge lint.
- [ ] Deploy to development environment.
- [ ] Install on Jira Cloud development/demo site.
- [ ] Verify project page and issue panel in Jira.

## Paused integration work

The following source/design work exists for a future integration phase, but it is not part of the active Forge UI milestone:

- [x] Inspect existing Seepsight repository and document the current data/tenant model.
- [x] Draft the secure integration contract and identity-linking design.
- [x] Add an isolated FastAPI backend scaffold and related tests.
- [x] Add pairing-code issuance source in the existing Seepsight repository.
- [x] Add API-side pairing redemption, revocation, and read-only summary source.
- [x] Document the proposed Cloud Run deployment and Forge Remote authentication.
- [ ] Deploy the API or configure a Forge Remote.
- [ ] Connect Jira UI to Firebase, BigQuery, Gemini, NVIDIA NIM, or production procurement records.
- [ ] Implement Rovo actions that depend on live Seepsight data.

No API deployment or live account linking is being performed in this phase.

## Known limitations / risks

- The Forge app is source-scaffolded but not deployed or runtime-tested in Jira.
- The app ID in `manifest.yml` is intentionally a placeholder until Forge registration.
- UI HTML/CSS resources are copied and JavaScript bundles are generated during CI by `npm run build:ui`; generated build artifacts are not committed.
- All displayed figures and records are illustrative sample content. Sample action completion changes only the local preview state.
- No live Jira-to-Seepsight production connection is active. Gemini, BigQuery, NVIDIA NIM, and Rovo are not connected to the Jira app.
- A production dependency audit found 9 transitive advisories in the current Forge dependency tree (5 high, 4 moderate). The audit remains informational and should be reassessed before release; do not run `npm audit fix --force` blindly.
