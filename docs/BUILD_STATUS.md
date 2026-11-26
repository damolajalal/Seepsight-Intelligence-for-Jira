# Jira app build register

Last updated: 2026-11-26

This register is separate from the existing Seepsight platform's master issue register.

## Implemented in repository

- [x] Correct repository initialised and main branch verified.
- [x] Forge project page and issue panel module declarations.
- [x] Custom UI build directories and HTML/CSS entry points.
- [x] Forge resolver for health, project context, and issue details.
- [x] Dashboard preview navigation for Overview, Investigations, Findings, Suppliers, and Actions.
- [x] Sample-only action completion interaction.
- [x] Clear sample-data labels.
- [x] GitHub Actions workflow added for Node.js 24, unit tests, Custom UI bundling, and Forge lint.

## Blocked on Atlassian environment

- [ ] Atlassian account and Forge API token.
- [ ] Forge CLI authentication.
- [ ] Register app and replace placeholder app ID.
- [ ] Install dependencies and generate UI bundles.
- [ ] Confirm the GitHub Actions validation workflow passes (tests, UI build, and Forge lint).
- [ ] Deploy to development environment.
- [ ] Install on Jira Cloud development/demo site.
- [ ] Verify project page and issue panel in Jira.

## Integration backlog

- [x] Inspect the existing Seepsight repository; no documented public HTTP API was identified in its Streamlit entry point/README.
- [x] Draft the proposed secure Seepsight-to-Jira API contract and tenant-isolation requirements (`docs/SEEPSIGHT_INTEGRATION_CONTRACT.md`).
- [ ] Approve and implement the actual Seepsight API, authentication, and tenant mapping.
- [ ] Add Forge backend egress allowlist for the confirmed Seepsight API host.
- [ ] Connect verified findings, exposure values, supplier records, and investigation data.
- [ ] Add evidence references and traceability for every AI explanation.
- [ ] Add Jira issue creation/comment/action workflows with user confirmation.
- [ ] Integrate Gemini server-side; never place credentials in browser code.
- [ ] Evaluate Rovo agent/action integration and required permissions.
- [ ] Evaluate Teamwork Graph access and usefulness.

## Known limitations / risks

- The app is source-scaffolded but not deployed or runtime-tested. Unit tests and build/lint checks are now configured in GitHub Actions; their first run must be inspected before treating them as passing.
- The app ID in `manifest.yml` is intentionally a placeholder until Forge registration.
- UI bundle files are generated locally by `npm run build:ui`; the committed build folders currently contain HTML/CSS only.
- All displayed figures and records are illustrative sample content.
- No Seepsight, Gemini, BigQuery, Firebase, NVIDIA NIM, or Rovo connection is active. The existing Seepsight app is Streamlit-based; a supported API must be implemented before Forge can connect safely.
- Node dependency installation and Forge lint have not been run in this environment.
