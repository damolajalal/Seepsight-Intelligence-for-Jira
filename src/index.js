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
