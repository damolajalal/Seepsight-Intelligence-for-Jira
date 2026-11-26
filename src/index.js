import Resolver from '@forge/resolver';
import { api, route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getHealth', async () => ({
  status: 'scaffold',
  product: 'Seepsight Intelligence for Jira',
  integrations: {
    jira: 'forge-resolver',
    seepsight: 'not-configured',
    gemini: 'not-configured',
    rovo: 'not-configured',
    nvidia: 'not-configured'
  }
}));

resolver.define('getProjectContext', async ({ context }) => ({
  cloudId: context?.cloudId ?? null,
  projectKey: context?.extension?.project?.key ?? null,
  projectId: context?.extension?.project?.id ?? null
}));

resolver.define('getCurrentIssue', async ({ context }) => {
  const issueKey = context?.extension?.issue?.key;
  if (!issueKey) return { issueKey: null, issue: null };

  const response = await api.asUser().requestJira(
    route`/rest/api/3/issue/${issueKey}?fields=summary,status,issuetype,assignee`
  );
  if (!response.ok) {
    return { issueKey, error: `Jira returned ${response.status}` };
  }
  const issue = await response.json();
  return {
    issueKey,
    issue: {
      key: issue.key,
      summary: issue.fields?.summary ?? '',
      status: issue.fields?.status?.name ?? 'Unknown',
      issueType: issue.fields?.issuetype?.name ?? 'Unknown',
      assignee: issue.fields?.assignee?.displayName ?? 'Unassigned'
    }
  };
});

export const handler = resolver.getDefinitions();
