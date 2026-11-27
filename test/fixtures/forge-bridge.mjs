const params = new URLSearchParams(globalThis.location?.search || '');
const issueState = params.get('issueState');
const dashboardState = params.get('dashboardState');

export const view = {
  async getContext() {
    if (dashboardState === 'context-failure') throw new Error('SIMULATED_CONTEXT_FAILURE_SECRET');
    return { extension: { project: { key: 'DEMO' } } };
  }
};

export async function invoke(resolverName) {
  if (resolverName === 'getHealth') {
    if (dashboardState === 'health-failure') throw new Error('SIMULATED_HEALTH_FAILURE_SECRET');
    if (dashboardState === 'health-warning') return { status: 'unavailable' };
    return { status: 'scaffold' };
  }
  if (resolverName === 'getProjectContext') {
    if (dashboardState === 'project-failure') throw new Error('SIMULATED_PROJECT_FAILURE_SECRET');
    return { projectKey: 'DEMO' };
  }
  if (resolverName === 'getCurrentIssue') {
    if (issueState === 'missing') {
      return { issueKey: 'DEMO-101', issue: null, error: 'This Jira issue could not be found. It may have been moved or deleted.' };
    }
    if (issueState === 'forbidden') {
      return { issueKey: 'DEMO-101', issue: null, error: 'You do not have permission to view this Jira issue.' };
    }
    if (issueState === 'unavailable') throw new Error('SIMULATED_INTERNAL_FAILURE_SECRET');
    return {
      issue: {
        key: 'DEMO-101',
        summary: 'Review sample procurement evidence',
        status: 'In Progress',
        issueType: 'Task',
        assignee: 'Demo Reviewer'
      }
    };
  }
  return null;
}
