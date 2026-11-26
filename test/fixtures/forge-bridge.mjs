export const view = {
  async getContext() {
    return { extension: { project: { key: 'DEMO' } } };
  }
};

export async function invoke(resolverName) {
  if (resolverName === 'getHealth') return { status: 'scaffold' };
  if (resolverName === 'getProjectContext') return { projectKey: 'DEMO' };
  if (resolverName === 'getCurrentIssue') {
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
