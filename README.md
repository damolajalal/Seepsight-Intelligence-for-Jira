# Seepsight Intelligence for Jira

Evidence-first procurement risk and action intelligence embedded in Jira.

## Current repository status

The initial Forge application scaffold is committed to `main`. It includes:
- Jira project page and issue panel module declarations
- Server-side Forge resolver for health, project context, and current Jira issue details
- Responsive dark dashboard preview with navigation and clearly labelled illustrative metrics
- Compact Jira issue panel preview
- Frontend bundling commands for the Forge bridge

**Not yet connected:** the existing Seepsight platform, Gemini, BigQuery, Firebase, NVIDIA NIM, or Rovo. The dashboard's portfolio figures are sample placeholders, not live findings.

## Architecture

- **Atlassian Forge:** hosting, Jira modules, permissions, and server-side resolver.
- **Custom UI:** static dashboard and issue-panel interfaces.
- **Existing Seepsight:** planned secure intelligence source; keep its existing repository and deployment separate.
- **AI:** Gemini explanations must be grounded in verified findings and evidence. Rovo is a planned Atlassian-native interaction layer, subject to implementation and platform access.

## Local setup

1. Install Node.js 22 or 24 and npm.
2. Install the Atlassian Forge CLI and authenticate: `npm install -g @forge/cli`, then `forge login`.
3. Register this repository as a Forge app using `forge register`. Forge must replace the placeholder app ARI in `manifest.yml` with the real app ID.
4. Install dependencies: `npm install`.
5. Build the Custom UI bridge bundles: `npm run build:ui`.
6. Validate and deploy to a development environment: `forge lint`, then `forge deploy`.
7. Install the app on a Jira development site: `forge install`.

The first Forge registration and deployment require an Atlassian account and a local Forge CLI session. Do not paste API keys, service-account credentials, or private tokens into this repository or browser code.

## Security principles

- Never expose API keys, service-account credentials, or database credentials in browser assets.
- Validate authorization using Forge resolver context, not frontend-supplied context.
- Apply least-privilege Jira scopes and add permissions only when a feature requires them.
- Treat external Seepsight requests as server-side integrations with explicit egress and authentication configuration.
- Keep sample data visibly labelled until connected to verified source data.

## Roadmap

1. Complete Forge registration, validation, and first Jira installation.
2. Verify project-page and issue-panel rendering in a real Jira development site.
3. Connect the Seepsight backend through a secure server-side integration.
4. Build evidence-linked investigations, findings, suppliers, and Jira action workflows.
5. Add grounded Gemini explanations and assess Rovo integration.
6. Evaluate Teamwork Graph feasibility and access.
7. Complete mobile, permission, security, and end-to-end demo testing for Codegeist 2026.
