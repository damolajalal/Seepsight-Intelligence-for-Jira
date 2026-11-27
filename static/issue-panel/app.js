import { invoke } from '@forge/bridge';
import { getEvidenceSummary, toggleEvidence } from './evidence-review.mjs';

const byId = (id) => document.getElementById(id);
const evidence = [
  { id: 'purchase-order', name: 'Purchase order', description: 'Illustrative source document', reference: 'SAMPLE-PO-0142', recordedQuantity: '1,000 units ordered' },
  { id: 'delivery-confirmation', name: 'Delivery confirmation', description: 'Illustrative source document', reference: 'SAMPLE-DN-8821', recordedQuantity: '800 units delivered' },
  { id: 'goods-received-note', name: 'Goods received note', description: 'Illustrative source document', reference: 'SAMPLE-GRN-4418', recordedQuantity: '800 units received' }
];
let reviewedEvidence = [];
let previewReviewed = false;

function setIssueValue(id, value) {
  byId(id).textContent = value || '—';
}

function renderEvidencePreview() {
  const list = byId('evidence-list');
  list.replaceChildren();
  evidence.forEach((item) => {
    const row = document.createElement('li');
    row.className = 'evidence-row';
    const copy = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = item.name;
    const description = document.createElement('small');
    description.textContent = `${item.description} · Ref ${item.reference} · ${item.recordedQuantity}`;
    copy.append(name, description);
    const label = document.createElement('label');
    label.className = 'evidence-check';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = reviewedEvidence.includes(item.id);
    checkbox.setAttribute('aria-label', `Mark ${item.name} checked in sample review`);
    checkbox.addEventListener('change', () => {
      reviewedEvidence = toggleEvidence(reviewedEvidence, item.id);
      previewReviewed = false;
      updateReviewSummary();
      setReviewState();
    });
    const state = document.createElement('span');
    state.textContent = 'Reviewed';
    label.append(checkbox, state);
    row.append(copy, label);
    list.append(row);
  });
  updateReviewSummary();
}

function updateReviewSummary() {
  const summary = getEvidenceSummary(evidence, reviewedEvidence);
  byId('evidence-progress').textContent = `${summary.reviewed} of ${summary.total} documents checked`;
  byId('evidence-progress-bar').style.width = `${summary.total ? (summary.reviewed / summary.total) * 100 : 0}%`;
  byId('evidence-progress-bar').setAttribute('aria-valuenow', String(summary.reviewed));
  byId('evidence-progress-bar').setAttribute('aria-valuemax', String(summary.total));
  byId('review-button').disabled = !summary.complete;
}

function setReviewState() {
  const button = byId('review-button');
  const message = byId('review-message');
  button.textContent = previewReviewed ? 'Undo local review' : 'Mark preview reviewed';
  button.setAttribute('aria-pressed', String(previewReviewed));
  message.textContent = previewReviewed
    ? 'All sample documents checked. Preview marked reviewed on this screen only; no Jira issue or Seepsight record was changed.'
    : 'Check all three sample documents to enable the local review action. Nothing is saved to Jira.';
}

byId('review-button').addEventListener('click', () => {
  const summary = getEvidenceSummary(evidence, reviewedEvidence);
  if (!summary.complete && !previewReviewed) return;
  previewReviewed = !previewReviewed;
  setReviewState();
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
  } catch {
    state.dataset.state = 'error';
    state.textContent = 'Could not load Jira issue context. Reopen the panel or confirm the Forge deployment and permissions.';
    byId('issue-context').hidden = true;
  }
}

renderEvidencePreview();
setReviewState();
loadIssue();
