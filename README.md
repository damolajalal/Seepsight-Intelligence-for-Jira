# Seepsight Intelligence for Jira

Evidence-first procurement risk and action intelligence embedded in Jira.

## Current repository status

The Forge application scaffold and first responsive preview are committed to `main`.

Implemented in source:
- Jira project page and issue panel module declarations
- Forge resolver for app health, project context, and current Jira issue details
- Responsive dashboard with Overview, Investigations, Findings, Suppliers, and Actions views
- Clearly labelled illustrative records and metrics (not live procurement data)
- Issue panel displaying Jira issue summary, type, status, and assignee
- Separate Custom UI build directories for Forge-hosted static resources
- Frontend bundling command using esbuild and the official Forge bridge

**Not yet connected:** the existing Seepsight platform, Gemini, BigQuery, Firebase, NVIDIA NIM, or Rovo. Do not treat preview metrics or records as verified findings.

## Architecture

- **Atlassian Forge:** Jira modules, hosting, permissions, and server-side resolver.
- **Custom UI:** dashboard and issue-panel interfaces, bundled with esbuild.
- **Existing Seepsight:** planned secure intelligence source; its existing repository and deployment remain separate.
- **AI:** Gemini explanations must be grounded in verified findings and evidence. Rovo is a planned Atlassian-native interaction layer, subject to implementation and platform access.

## Local setup

Requirements: an Atlassian account, Node.js 22.23.4+ or 24.22.1+, npm, and a Jira Cloud development site.

1. Install the Forge CLI: `npm install -g @forge/cli`.
2. Create an Atlassian API token with Forge scopes, then authenticate: `forge login`.
3. From the repository root, register this existing app: `forge register`. This replaces the placeholder app ARI in `manifest.yml` with a real app ID. Do not run register repeatedly; it creates a new app identity.
4. Install dependencies: `npm install`.
5. Build the Custom UI bundles: `npm run build:ui`.
6. Validate and deploy to development: `forge lint`, then `forge deploy`.
7. Provision a demo Jira site with `forge site provision`, or install on a prepared development site with `forge install`.

The Forge-hosted resources are the `static/dashboard/build` and `static/issue-panel/build` directories. The build command creates their JavaScript bundles.

For a demo development site, Forge provides a CLI provisioning flow. Traditional cloud developer sites are also available through [Atlassian Cloud Developer](https://go.atlassian.com/cloud-dev).

## Security principles

- Never expose API keys, service-account credentials, or database credentials in browser assets or Git.
- Validate authorization using Forge resolver context, not frontend-supplied context.
- Apply least-privilege Jira scopes and add permissions only when a feature requires them.
- External Seepsight requests must be server-side, authenticated, and allowlisted in Forge egress configuration.
- Do not connect to a production data source until the API contract, tenant authorization, and data-minimization rules are agreed.
- Keep sample data visibly labelled until connected to verified source data.

## Roadmap

1. Complete Forge registration, validation, and first Jira installation.
2. Verify project-page and issue-panel rendering in a real Jira development site.
3. Agree the Seepsight API contract and connect through a secure server-side integration.
4. Replace sample content with evidence-linked investigations, findings, suppliers, and Jira actions.
5. Add grounded Gemini explanations and assess Rovo integration.
6. Evaluate Teamwork Graph feasibility and access.
7. Complete mobile, permission, security, and end-to-end demo testing for Codegeist 2026.
