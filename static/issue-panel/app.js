import { invoke } from '@forge/bridge';

const byId = (id) => document.getElementById(id);

function setIssueValue(id, value) {
  byId(id).textContent = value || '—';
}

function renderEvidencePreview() {
  const evidence = [
    { name: 'Purchase order', description: 'Illustrative source document · PO reference', state: 'Example required' },
    { name: 'Delivery confirmation', description: 'Illustrative source document · received quantity', state: 'Example pending' },
    { name: 'Goods received note', description: 'Illustrative source document · receiving record', state: 'Example pending' }
  ];
  const list = byId('evidence-list');
  list.replaceChildren();
  evidence.forEach((item) => {
    const row = document.createElement('li');
    row.className = 'evidence-row';
    const copy = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = item.name;
    const description = document.createElement('small');
    description.textContent = item.description;
    copy.append(name, description);
    const status = document.createElement('span');
    status.className = 'evidence-state';
    status.textContent = item.state;
    row.append(copy, status);
    list.append(row);
  });
}

function setReviewState(reviewed) {
  const button = byId('review-button');
  const message = byId('review-message');
  button.textContent = reviewed ? 'Undo local review' : 'Mark preview reviewed';
  button.setAttribute('aria-pressed', String(reviewed));
  message.textContent = reviewed
    ? 'Preview marked reviewed on this screen only. No Jira issue or Seepsight record was changed.'
    : 'This is a local preview control. It does not update Jira or Seepsight.';
}

byId('review-button').addEventListener('click', () => {
  const reviewed = byId('review-button').getAttribute('aria-pressed') !== 'true';
  setReviewState(reviewed);
});

async function loadIssue() {
  const state = byId('state');
  state.dataset.state = 'loading';
  state.textContent = 'Loading Jira issue context…';
  try {
    const result = await invoke('getCurrentIssue');
    if (result?.issue) {
      setIssueValue('issue-title', result.issue.summary || 'Untitled Jira issue');
      setIssueValue('issue-key', result.issue.key);
      setIssueValue('issue-status', result.issue.status);
      setIssueValue('issue-type', result.issue.issueType);
      setIssueValue('issue-assignee', result.issue.assignee);
      state.dataset.state = 'success';
      state.textContent = 'Jira issue context loaded. Procurement evidence below is illustrative only.';
      byId('issue-context').hidden = false;
    } else {
      state.dataset.state = 'warning';
      state.textContent = result?.error || 'Open this panel from a Jira issue to load its context.';
      byId('issue-context').hidden = true;
    }
  } catch (error) {
    state.dataset.state = 'error';
    state.textContent = 'Could not load Jira issue context. Reopen the panel or confirm the Forge deployment and permissions.';
    byId('issue-context').hidden = true;
    console.error('Unable to load Jira issue context.', error);
  }
}

renderEvidencePreview();
setReviewState(false);
loadIssue();
