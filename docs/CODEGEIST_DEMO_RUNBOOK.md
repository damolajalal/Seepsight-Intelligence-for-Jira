# Codegeist demo runbook

## Product story

**Seepsight Intelligence for Jira** turns a procurement discrepancy into an evidence-led investigation workflow inside Jira. The current build is a Forge app source build using illustrative procurement data. It is not connected to a production Seepsight workspace. Its issue panel can persist the checklist in Forge app storage and, after an explicit user click, request creation of a Jira Task using the signed-in user's Jira permissions. These Jira write operations have passed simulated browser tests but have not yet been verified in a live Jira installation.

## Five-minute presentation outline

### 0:00–0:35 — Problem
Procurement and finance teams can miss delivery discrepancies when purchase orders, receiving records, supplier information, and follow-up work are spread across systems. A dashboard alone does not establish whether a loss occurred or who must resolve the issue.

### 0:35–1:15 — Product
Introduce the Jira project page and issue panel. Explain that the product is designed to keep investigation context and accountable follow-up close to the team's Jira workflow.

### 1:15–2:15 — Investigate the sample
Open the sample investigation **INV-024 — Delivery quantity mismatch**:
- Purchase order: 1,000 units.
- Recorded received quantity: 800 units.
- Quantity difference: 200 units.
- Illustrative unit price: ₦24,000.
- Arithmetic exposure: 200 × ₦24,000 = ₦4,800,000.

Explicitly state that this is a demonstration calculation, not a confirmed loss. A real investigation must inspect the signed purchase order, delivery confirmation, goods-received note, approved adjustments, quality/partial-delivery terms, and applicable price.

### 2:15–3:10 — Follow the evidence
Navigate from the investigation to the linked finding and related sample records. Open the Jira issue panel and walk through its evidence checklist. Mark each sample document as reviewed; explain that checklist progress is stored in the Forge app workspace for that Jira issue. The source documents remain fictional and are not attached evidence.

### 3:10–4:10 — Show workflow value
From finding **FND-108**, open the linked action **ACT-032 — Confirm delivery note and received quantity**. Show its linked investigation (**INV-024**), linked finding (**FND-108**), accountable owner (Procurement team), three source references, and required reconciliation step. Explain the closure condition: obtain signed source documents and confirm whether an approved partial delivery, adjustment, or quality hold accounts for the 200-unit variance. In the Jira issue panel, explicitly trigger creation of the follow-up Task and show the returned Jira issue key and relation result. This creates a real Jira Task when run in an installed app with the required project permissions; the Task description clearly labels the sample references as fictional. Then move through Suppliers and Actions to show how the owner and due date sit alongside the evidence trail.

### 4:10–5:00 — Architecture and roadmap
Explain the current Forge project page/issue panel, Jira read/write scopes limited to issue context and user-triggered Task creation, Forge KVS for per-issue checklist state, current-user Jira permissions, and automated UI tests. Then distinguish future work: secure Seepsight API connection, verified evidence retrieval, grounded Gemini explanations, and Rovo actions. Do not claim these integrations are live.

## Demo readiness checklist

- [ ] Register the Forge app once in the authorised Atlassian environment.
- [ ] Run authenticated Forge lint and resolve all blocking findings.
- [ ] Deploy to a development environment and install on the Jira Cloud development site.
- [ ] Verify the project page and issue panel in Jira using a real test project and issue.
- [ ] Verify a user-triggered Jira Task is created once, linked where permitted, and reported correctly.
- [ ] Verify evidence-review state persists after closing and reopening the Jira issue panel.
- [ ] Check narrow-screen layout, keyboard navigation, focus handling, and accessible names in Jira.
- [ ] Record a public YouTube demo under five minutes.
- [ ] Complete the Devpost submission, including install instructions, category, and honest technology/integration statements.

## Claims to avoid

Until implemented and tested, do not claim:
- live Seepsight or production procurement data access;
- Gemini, NVIDIA NIM, Rovo, or Teamwork Graph integration;
- verified live Jira Task creation or issue linking before testing in the installed Jira app;
- confirmed savings, losses, or financial recovery based on sample values;
- successful Marketplace publication or production deployment.

## Current technical verification

The repository's GitHub Actions workflow validates unit tests, production Custom UI builds, deterministic test-only Forge bridge builds, and Chromium UI interactions. Authenticated Forge lint and live Jira runtime validation require the user's Atlassian environment and credentials; never commit API tokens.
