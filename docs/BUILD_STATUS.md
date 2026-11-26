# Jira app build register

Last updated: 2026-11-26

This register is separate from the existing Seepsight platform's master issue register.

## Active Forge app scope

The current phase is the standalone Jira Forge experience. API deployment, Cloud Run, Firebase account linking, and live procurement data are deliberately paused until explicitly approved.

## Implemented in repository

- [x] Correct repository initialised and main branch verified.
- [x] Forge project page and issue panel module declarations.
- [x] Custom UI build directories and HTML/CSS entry points.
- [x] Forge resolver for health, project context, and issue details.
- [x] Dashboard preview navigation for Overview, Investigations, Findings, Suppliers, and Actions.
- [x] Responsive, accessible client-side filtering for preview tables.
- [x] Sample-only action completion interaction.
- [x] Clear sample-data labels.
- [x] GitHub Actions workflow for Node.js 24, production dependency audit, unit tests, and both Custom UI bundles.
- [x] Forge CI is isolated from the paused Python API scaffold.

## Next Forge app work

- [ ] Improve investigation and finding detail experiences using clearly labelled sample data.
- [x] Add issue-panel evidence checklist with explicit sample-only labels.
- [x] Add local review toggle with clear no-Jira-write messaging.
- [x] Add issue context loading, warning, and error states.
- [x] Add responsive issue-panel styling and keyboard focus treatment.
- [ ] Add empty, loading, error, and narrow-screen states.
- [ ] Add UI-focused tests for navigation, filtering, sample-only actions, and issue-panel review state.
- [ ] Review keyboard navigation, focus states, and accessible labels.
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
- UI JavaScript bundles are generated during CI by `npm run build:ui`; generated bundles are not committed.
- All displayed figures and records are illustrative sample content. Sample action completion changes only the local preview state.
- No live Jira-to-Seepsight production connection is active. Gemini, BigQuery, NVIDIA NIM, and Rovo are not connected to the Jira app.
- A production dependency audit found 9 transitive advisories in the current Forge dependency tree (5 high, 4 moderate). The audit remains informational and should be reassessed before release; do not run `npm audit fix --force` blindly.
