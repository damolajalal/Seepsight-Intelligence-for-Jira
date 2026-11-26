import { invoke } from '@forge/bridge';

async function loadIssue() {
  const state = document.getElementById('state');
  try {
    const result = await invoke('getCurrentIssue');
    if (result?.issue) {
      document.getElementById('issue-title').textContent = result.issue.summary || 'Untitled Jira issue';
      document.getElementById('issue-key').textContent = result.issue.key;
      document.getElementById('issue-status').textContent = result.issue.status;
      document.getElementById('issue-type').textContent = result.issue.issueType;
      document.getElementById('issue-assignee').textContent = result.issue.assignee;
      state.textContent = 'Jira issue context loaded. Seepsight evidence connection is the next integration step.';
    } else {
      state.textContent = result?.error || 'Open this panel from a Jira issue to load its context.';
    }
  } catch (error) {
    state.textContent = 'Could not load issue context. Confirm Forge deployment and permissions.';
    console.error(error);
  }
}

loadIssue();
