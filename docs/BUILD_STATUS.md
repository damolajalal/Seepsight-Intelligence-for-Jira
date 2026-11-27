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
- [x] Validate Jira issue keys before making issue requests.
- [x] Convert Jira permission, missing-issue, rate-limit, and service failures into safe user-facing messages.
- [x] Normalise Jira issue responses to an explicit field allowlist and bound returned text.
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
- [x] Add per-document local review checkboxes, progress indicator, and completion-gated preview review action.
- [x] Add local review toggle with clear no-Jira-write messaging.
- [x] Add issue context loading, warning, and error states.
- [x] Make dashboard refresh distinguish successful context refreshes from failures, prevent overlapping refresh requests, and announce connection-state changes to assistive technology.
- [x] Add responsive issue-panel styling, keyboard focus treatment, comfortable touch targets, and reduced-motion support.
- [x] Add dashboard and issue-panel narrow-screen layout contract checks; issue-panel loading, warning, and error states are implemented.
- [x] Make the UI build copy the current HTML and CSS into Forge resource directories as well as bundling JavaScript, preventing stale deployed UI assets.
- [x] Add Chromium-based dashboard and issue-panel interaction tests to CI for filtering, empty search results, related-record dialog navigation, local action completion, evidence review gating, and mobile viewport overflow.
- [ ] Add a true empty-data state when live data is introduced; current sample tables intentionally contain demonstration records.
- [x] Add static UI contract tests for navigation semantics, accessible record dialog, sample-only disclosures, evidence progress semantics, safe DOM rendering, issue-panel touch/motion accessibility, and dashboard skip navigation.
- [x] Add unit tests for evidence review state and completion rules.
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
- [ ] Review app presentation and demo flow for Codegeist.

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
