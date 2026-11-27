import Resolver from '@forge/resolver';
import { api, route } from '@forge/api';
import { kvs } from '@forge/kvs';
import { createHealthPayload } from './health-status.mjs';
import {
  getIssueLoadError,
  isValidJiraIssueKey,
  normaliseJiraIssue
} from './jira-issue.mjs';

const resolver = new Resolver();
const EVIDENCE_IDS = new Set(['purchase-order', 'delivery-confirmation', 'goods-received-note']);

function getReviewKey(context) {
  const cloudId = context?.cloudId;
  const issueKey = context?.extension?.issue?.key;
  if (!cloudId || !isValidJiraIssueKey(issueKey)) return null;
  return `evidence-review:${cloudId}:${issueKey}`;
}

resolver.define('getHealth', async () => createHealthPayload());

resolver.define('getProjectContext', async ({ context }) => ({
  cloudId: context?.cloudId ?? null,
  projectKey: context?.extension?.project?.key ?? null,
  projectId: context?.extension?.project?.id ?? null
}));

resolver.define('getCurrentIssue', async ({ context }) => {
  const issueKey = context?.extension?.issue?.key;
  if (!issueKey) return { issueKey: null, issue: null };
  if (!isValidJiraIssueKey(issueKey)) {
    return { issueKey: null, issue: null, error: 'The Jira issue context is invalid.' };
  }

  try {
    const response = await api.asUser().requestJira(
      route`/rest/api/3/issue/${issueKey}?fields=summary,status,issuetype,assignee`
    );
    if (!response?.ok) {
      return { issueKey, issue: null, error: getIssueLoadError(response?.status) };
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      return { issueKey, issue: null, error: 'Jira returned an unreadable issue response.' };
    }
    const issue = normaliseJiraIssue(payload, issueKey);
    if (!issue) {
      return { issueKey, issue: null, error: 'Jira returned incomplete issue details.' };
    }
    return { issueKey, issue };
  } catch {
    return { issueKey, issue: null, error: 'Unable to contact Jira right now. Please try again.' };
  }
});

resolver.define('createFollowUpTask', async ({ context }) => {
  const issueKey = context?.extension?.issue?.key;
  if (!isValidJiraIssueKey(issueKey)) {
    return { success: false, error: 'Open this action from a valid Jira issue.' };
  }

  try {
    const sourceResponse = await api.asUser().requestJira(
      route`/rest/api/3/issue/${issueKey}?fields=project`
    );
    if (!sourceResponse?.ok) {
      return { success: false, error: getIssueLoadError(sourceResponse?.status) };
    }
    const sourceIssue = await sourceResponse.json();
    const projectId = sourceIssue?.fields?.project?.id;
    if (!projectId) return { success: false, error: 'The Jira project could not be identified.' };

    const description = {
      type: 'doc',
      version: 1,
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: `Follow-up created from procurement review of Jira issue ${issueKey}.` }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Reconcile the purchase order quantity (1,000 units) against the illustrative delivery and goods-received quantities (800 units). Verify signed source documents, approved partial deliveries, adjustments and quality holds before confirming any loss.' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Demo references only: SAMPLE-PO-0142, SAMPLE-DN-8821, SAMPLE-GRN-4418. These are fictional and are not attached evidence.' }] }
      ]
    };
    const createResponse = await api.asUser().requestJira(route`/rest/api/3/issue`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          project: { id: String(projectId) },
          issuetype: { name: 'Task' },
          summary: `Procurement evidence follow-up for ${issueKey}`,
          description
        }
      })
    });
    if (!createResponse?.ok) {
      return { success: false, error: createResponse?.status === 403
        ? 'You do not have permission to create Jira tasks in this project.'
        : 'Jira could not create the follow-up task. Check that this project supports the Task issue type and try again.' };
    }
    const created = await createResponse.json();
    const taskKey = created?.key;
    if (!isValidJiraIssueKey(taskKey)) {
      return { success: false, error: 'Jira accepted the request but did not return a valid task reference.' };
    }

    let linked = false;
    try {
      const linkResponse = await api.asUser().requestJira(route`/rest/api/3/issueLink`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: { name: 'Relates' },
          inwardIssue: { key: issueKey },
          outwardIssue: { key: taskKey }
        })
      });
      linked = linkResponse?.ok === true;
    } catch {
      linked = false;
    }
    return {
      success: true,
      taskKey,
      linked,
      message: linked
        ? `Jira task ${taskKey} was created and linked to ${issueKey}.`
        : `Jira task ${taskKey} was created. Jira did not confirm the issue link; you can link it manually.`
    };
  } catch {
    return { success: false, error: 'Unable to create the Jira follow-up right now. Please try again.' };
  }
});

resolver.define('getEvidenceReview', async ({ context }) => {
  const key = getReviewKey(context);
  if (!key) return { reviewedEvidence: [], reviewCompleted: false, error: 'A valid Jira issue context is required.' };
  try {
    const saved = await kvs.get(key);
    return {
      reviewedEvidence: Array.isArray(saved?.reviewedEvidence)
        ? saved.reviewedEvidence.filter((id) => EVIDENCE_IDS.has(id))
        : [],
      reviewCompleted: saved?.reviewCompleted === true
    };
  } catch {
    return { reviewedEvidence: [], reviewCompleted: false, error: 'Saved review state is temporarily unavailable.' };
  }
});

resolver.define('saveEvidenceReview', async ({ payload, context }) => {
  const key = getReviewKey(context);
  if (!key) return { success: false, error: 'A valid Jira issue context is required.' };
  const submitted = Array.isArray(payload?.reviewedEvidence) ? payload.reviewedEvidence : [];
  const reviewedEvidence = [...new Set(submitted.filter((id) => EVIDENCE_IDS.has(id)))];
  const reviewCompleted = payload?.reviewCompleted === true && reviewedEvidence.length === EVIDENCE_IDS.size;
  try {
    await kvs.set(key, { reviewedEvidence, reviewCompleted, updatedAt: new Date().toISOString() });
    return { success: true, reviewedEvidence, reviewCompleted };
  } catch {
    return { success: false, error: 'Could not save review progress. Please try again.' };
  }
});

export const handler = resolver.getDefinitions();
