# Rovo integration plan

Status: design approved for implementation planning; no Rovo module is enabled yet.

## Recommended approach

Use a native Forge `rovo:agent` with narrowly scoped Forge `action` modules. This keeps the user interaction inside Atlassian while ensuring all sensitive data access happens in Forge server-side functions and, later, the authenticated Seepsight API.

The app-based Agent is scoped to the Atlassian workspace where this app is installed. It must not be assumed to have automatic access to other Atlassian apps or external Seepsight data.

## Proposed agent

Name: **Seepsight Risk Analyst**

Purpose:
- Explain verified procurement findings and their supporting evidence.
- Summarise supplier and investigation risk for the current Jira project.
- Help users understand why a finding was raised and what evidence is missing.
- Recommend next steps without presenting recommendations as completed actions.

Agent behaviour:
- Use only records returned by authorised Seepsight actions and Jira context.
- Cite finding IDs, evidence IDs, source record IDs, detector/version, and observation dates in answers.
- Distinguish potential exposure from confirmed loss, recovered savings, or approved financial amounts.
- Preserve amounts and currency exactly as returned by the backend.
- State when evidence is incomplete, conflicting, stale, or unavailable.
- Never invent a finding, supplier, amount, evidence item, confidence score, or completed action.
- Never treat a user-supplied or model-extracted issue key, tenant ID, account ID, or supplier ID as proof of authorisation.
- Do not create or modify Jira issues, comments, or Seepsight actions without an explicit user request and server-side permission checks.

## Action design

Implement read-only actions first:

1. `get-project-risk-summary`
   - Resolve the Jira project from trusted Forge context.
   - Return counts and aggregate values only when the backend provides them.
2. `search-procurement-findings`
   - Accept optional search terms and category/severity filters.
   - Derive tenant/workspace access on the server; do not trust caller-supplied tenant identifiers.
   - Return a bounded, paginated set of findings with evidence references.
3. `get-finding-evidence`
   - Resolve a finding by ID only after checking the current user's access.
   - Return a minimal evidence packet and canonical Seepsight deep link.

Later, after write permissions and confirmation UX are agreed:
4. `create-jira-investigation`
5. `create-follow-up-action`

Write actions must validate every field, re-check permissions, prevent duplicate submissions, record an audit event, and return the created Jira/Seepsight reference. The model's extracted inputs must never determine authorisation.

## Implementation dependencies

- The Seepsight API and authentication contract in `SEEPSIGHT_INTEGRATION_CONTRACT.md` must be implemented first.
- Confirm the Jira site/project to Seepsight tenant/workspace mapping.
- Add only the approved backend hostname to Forge egress permissions.
- Define per-action scopes and ensure the server checks the acting user's identity and access.
- Keep all external API credentials out of the Custom UI and Rovo prompt.
- Keep responses well below the Rovo action 5 MB payload limit; use pagination and compact evidence references.

## MCP and Teamwork Graph

- Consider `rovo:mcp` only after the core Agent/actions work. Atlassian currently documents it as Preview, so it should not be the only route to the Rovo bonus.
- Teamwork Graph remains a separate stretch goal and requires a verified supported integration path; do not claim it is connected until tested.

## Official references

- Rovo Agent module: https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent/
- Rovo Action module: https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-action/
- Rovo MCP module: https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-mcp/
- Rovo modules overview: https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-index/

## Release gate

Do not add a Rovo Agent or action module to the production manifest until:
- the Seepsight API is implemented and authenticated;
- the tenant and user permission model is verified;
- read-only actions pass tests against authorised and unauthorised users;
- prompt tests demonstrate evidence-grounded responses and refusal to invent missing data;
- any write action has explicit confirmation and audit coverage.
