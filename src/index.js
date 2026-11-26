import Resolver from '@forge/resolver';
import { api, route } from '@forge/api';
import { createHealthPayload } from './health-status.mjs';
import {
  getIssueLoadError,
  isValidJiraIssueKey,
  normaliseJiraIssue
} from './jira-issue.mjs';

const resolver = new Resolver();

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
    return {
      issueKey,
      issue: null,
      error: 'Unable to contact Jira right now. Please try again.'
    };
  }
});

export const handler = resolver.getDefinitions();
