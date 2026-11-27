import { invoke } from '@forge/bridge';
import { getEvidenceSummary, toggleEvidence } from './evidence-review.mjs';

const byId = (id) => document.getElementById(id);
const evidence = [
  { id: 'purchase-order', name: 'Purchase order', description: 'Illustrative source document', reference: 'SAMPLE-PO-0142', recordedQuantity: '1,000 units ordered' },
  { id: 'delivery-confirmation', name: 'Delivery confirmation', description: 'Illustrative source document', reference: 'SAMPLE-DN-8821', recordedQuantity: '800 units delivered' },
  { id: 'goods-received-note', name: 'Goods received note', description: 'Illustrative source document', reference: 'SAMPLE-GRN-4418', recordedQuantity: '800 units received' }
];
let reviewedEvidence = [];
let reviewCompleted = false;
let issueLoaded = false;
let saving = false;
let creatingTask = false;

function setIssueValue(id, value) { byId(id).textContent = value || '—'; }

function updateReviewSummary() {
  const summary = getEvidenceSummary(evidence, reviewedEvidence);
  byId('evidence-progress').textContent = `${summary.reviewed} of ${summary.total} documents checked`;
  byId('evidence-progress-bar').style.width = `${summary.total ? (summary.reviewed / summary.total) * 100 : 0}%`;
  byId('evidence-progress-bar').setAttribute('aria-valuenow', String(summary.reviewed));
  byId('evidence-progress-bar').setAttribute('aria-valuemax', String(summary.total));
  byId('review-button').disabled = !summary.complete || saving || !issueLoaded;
  byId('save-state').textContent = saving ? 'Saving…' : 'Saved to this Jira app workspace';
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
    checkbox.disabled = !issueLoaded || saving;
    checkbox.setAttribute('aria-label', `Mark ${item.name} checked in sample review`);
    checkbox.addEventListener('change', async () => {
      reviewedEvidence = toggleEvidence(reviewedEvidence, item.id);
      reviewCompleted = false;
      await saveReview();
      renderEvidencePreview();
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

function setReviewState() {
  byId('review-button').textContent = reviewCompleted ? 'Review completed' : 'Complete evidence review';
  byId('review-button').setAttribute('aria-pressed', String(reviewCompleted));
  byId('review-message').textContent = reviewCompleted
    ? 'The sample checklist review is saved for this Jira issue. The source documents remain illustrative, not attached evidence.'
    : 'Check all three illustrative documents, then complete the review. Your checklist progress is saved to this Jira app workspace.';
}

async function saveReview() {
  saving = true;
  updateReviewSummary();
  try {
    const result = await invoke('saveEvidenceReview', { reviewedEvidence, reviewCompleted });
    if (!result?.success) throw new Error('save failed');
    reviewedEvidence = result.reviewedEvidence;
    reviewCompleted = result.reviewCompleted;
    byId('save-state').textContent = 'Progress saved';
  } catch {
    byId('save-state').textContent = 'Save failed — your latest change may not be stored. Retry by changing a check.';
  } finally {
    saving = false;
    updateReviewSummary();
  }
}

byId('review-button').addEventListener('click', async () => {
  const summary = getEvidenceSummary(evidence, reviewedEvidence);
  if (!summary.complete || !issueLoaded || saving) return;
  reviewCompleted = true;
  await saveReview();
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
      issueLoaded = true;
      byId('create-follow-up').disabled = false;
      byId('task-message').textContent = 'This action creates a real Jira Task in the current project.';
      try {
        const saved = await invoke('getEvidenceReview');
        reviewedEvidence = Array.isArray(saved?.reviewedEvidence) ? saved.reviewedEvidence : [];
        reviewCompleted = saved?.reviewCompleted === true;
        if (saved?.error) byId('save-state').textContent = saved.error;
      } catch {
        byId('save-state').textContent = 'Could not load saved review progress.';
      }
      renderEvidencePreview();
      setReviewState();
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

byId('create-follow-up').addEventListener('click', async () => {
  const button = byId('create-follow-up');
  if (!issueLoaded || creatingTask) return;
  creatingTask = true;
  button.disabled = true;
  button.textContent = 'Creating Jira task…';
  byId('task-message').textContent = 'Sending the task creation request to Jira.';
  try {
    const result = await invoke('createFollowUpTask');
    if (!result?.success) {
      byId('task-message').textContent = result?.error || 'Jira task creation failed.';
      return;
    }
    button.textContent = 'Jira task created';
    byId('task-message').textContent = result.message;
  } catch {
    byId('task-message').textContent = 'Could not create the Jira task. Please retry.';
  } finally {
    creatingTask = false;
    if (button.textContent !== 'Jira task created') {
      button.disabled = false;
      button.textContent = 'Create Jira follow-up task';
    }
  }
});

renderEvidencePreview();
setReviewState();
loadIssue();
