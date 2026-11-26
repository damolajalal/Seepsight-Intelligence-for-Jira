import { view, invoke } from '@forge/bridge';
import { getRelatedRecords } from './workflow-links.mjs';
import { filterRecords, getVisibleRecordCount } from './table-utils.mjs';

const title = document.getElementById('page-title');
const toast = document.getElementById('toast');
const projectChip = document.getElementById('project-chip');
const connectionLabel = document.getElementById('connection-label');
const secondaryView = document.getElementById('secondary-view');
const overviewNodes = [...document.querySelectorAll('.metrics,.content-grid,.table-panel')];
const labels = { overview: 'Overview', investigations: 'Investigations', findings: 'Findings', suppliers: 'Suppliers', actions: 'Actions' };

const demoRows = {
  investigations: [
    ['INV-024','Delivery quantity mismatch','Northstar Supplies','High','In review'],
    ['INV-023','Unit price variance','Greenfield Trading','Medium','Action needed'],
    ['INV-021','Approval cycle delay','Westline Partners','High','Open'],
    ['INV-019','Supplier concentration review','Kano Industrial','Medium','Monitoring']
  ],
  findings: [
    ['FND-108','Delivered quantity below purchase order','Delivery variance','High','Evidence review'],
    ['FND-106','Unit price increased across repeat orders','Price movement','Medium','Needs validation'],
    ['FND-102','Approval took longer than target','Process delay','Medium','Open']
  ],
  suppliers: [
    ['SUP-014','Northstar Supplies','4','High exposure','Under review'],
    ['SUP-011','Greenfield Trading','2','Medium exposure','Monitoring'],
    ['SUP-008','Westline Partners','3','High exposure','Action open']
  ],
  actions: [
    ['ACT-032','Confirm delivery note and received quantity','Procurement team','Today','Open'],
    ['ACT-029','Validate supplier price schedule','Finance reviewer','Tomorrow','Open'],
    ['ACT-025','Attach approval trail to investigation','Project lead','Overdue','Open']
  ]
};

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(window.__toastTimer);
  window.__toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function renderTable(viewName) {
  const rows = demoRows[viewName] || [];
  const headings = {
    investigations: ['REFERENCE','INVESTIGATION','SUPPLIER','RISK','STATUS'],
    findings: ['REFERENCE','FINDING','CATEGORY','RISK','STATUS'],
    suppliers: ['REFERENCE','SUPPLIER','OPEN ITEMS','EXPOSURE','STATUS'],
    actions: ['REFERENCE','ACTION','OWNER','DUE','STATUS']
  }[viewName];
  secondaryView.replaceChildren();
  const panelHead = document.createElement('div');
  panelHead.className = 'panel-head';
  const headingGroup = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'PREVIEW DATA · NOT LIVE';
  const heading = document.createElement('h2');
  heading.textContent = labels[viewName];
  headingGroup.append(eyebrow, heading);
  const tools = document.createElement('div');
  tools.className = 'table-tools';
  const searchInput = document.createElement('input');
  searchInput.className = 'table-search';
  searchInput.type = 'search';
  searchInput.setAttribute('aria-label', `Filter ${labels[viewName]}`);
  searchInput.placeholder = 'Filter records…';
  const resultCountNode = document.createElement('span');
  resultCountNode.className = 'result-count';
  resultCountNode.setAttribute('aria-live', 'polite');
  resultCountNode.textContent = `${rows.length} records`;
  tools.append(searchInput, resultCountNode);
  panelHead.append(headingGroup, tools);

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  [...headings, ...(viewName === 'actions' ? ['UPDATE'] : []), 'DETAILS'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headerRow.append(th);
  });
  thead.append(headerRow);
  const tbody = document.createElement('tbody');
  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    row.forEach((cell, cellIndex) => {
      const td = document.createElement('td');
      if (cellIndex === 3 && viewName !== 'actions') {
        const risk = document.createElement('span');
        risk.className = String(cell).toLowerCase().includes('high') ? 'risk-high' : 'risk-medium';
        risk.textContent = cell;
        td.append(risk);
      } else {
        td.textContent = cell;
      }
      tr.append(td);
    });
    if (viewName === 'actions') {
      const updateCell = document.createElement('td');
      const completeButton = document.createElement('button');
      completeButton.className = 'row-action';
      completeButton.type = 'button';
      completeButton.dataset.complete = String(index);
      completeButton.textContent = 'Mark complete';
      updateCell.append(completeButton);
      tr.append(updateCell);
    }
    const detailCell = document.createElement('td');
    const detailButton = document.createElement('button');
    detailButton.className = 'detail-action';
    detailButton.type = 'button';
    detailButton.dataset.detail = String(index);
    detailButton.setAttribute('aria-label', `View details for ${row[0]}`);
    detailButton.textContent = 'View';
    detailCell.append(detailButton);
    tr.append(detailCell);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  const emptyState = document.createElement('p');
  emptyState.className = 'empty-state';
  emptyState.hidden = true;
  emptyState.setAttribute('role', 'status');
  emptyState.textContent = 'No matching sample records.';
  const note = document.createElement('p');
  note.className = 'view-note';
  note.textContent = 'These sample records demonstrate the intended workflow. Verified Seepsight records will replace them after the secure backend connection is configured.';
  secondaryView.append(panelHead, wrap, emptyState, note);
  const tableRows = [...secondaryView.querySelectorAll('tbody tr')];
  const resultCount = resultCountNode;
  searchInput.addEventListener('input', () => {
    const filtered = filterRecords(rows, searchInput.value);
    filtered.forEach(({ index, matches }) => {
      tableRows[index].hidden = !matches;
    });
    const visible = getVisibleRecordCount(filtered);
    resultCount.textContent = `${visible} of ${rows.length} records`;
    emptyState.hidden = visible !== 0;
  });
  secondaryView.querySelectorAll('[data-detail]').forEach((button) => {
    button.addEventListener('click', () => openRecordDetails(viewName, rows[Number(button.dataset.detail)]));
  });
  secondaryView.querySelectorAll('[data-complete]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('tr');
      const status = document.createElement('span');
      status.className = 'status';
      status.textContent = 'Completed locally';
      row.lastElementChild.previousElementSibling.replaceChildren(status);
      button.remove();
      notify('Sample action marked complete in this preview only.');
    });
  });
}

function openRecordDetails(viewName, record) {
  if (!record) return;
  const dialog = document.getElementById('record-dialog');
  const titleNode = document.getElementById('record-dialog-title');
  const referenceNode = document.getElementById('record-dialog-reference');
  const summaryNode = document.getElementById('record-dialog-summary');
  const detailNode = document.getElementById('record-dialog-fields');
  const relatedNode = document.getElementById('record-dialog-related');
  const descriptions = {
    investigations: ['Investigation', 'Supplier', 'Risk level', 'Current status'],
    findings: ['Finding', 'Category', 'Risk level', 'Review status'],
    suppliers: ['Supplier', 'Open items', 'Exposure', 'Review status'],
    actions: ['Action', 'Owner', 'Due date', 'Current status']
  };
  const fields = descriptions[viewName] || [];
  titleNode.textContent = record[1];
  referenceNode.textContent = record[0] + ' · SAMPLE RECORD';
  summaryNode.textContent = viewName === 'findings'
    ? 'This sample finding needs supporting source documents and reviewer validation before it can be treated as confirmed.'
    : viewName === 'actions'
      ? 'This sample follow-up is shown to demonstrate ownership and due-date tracking. Changes in this preview are not sent to Jira.'
      : 'This sample record demonstrates how procurement context and review status can be presented alongside Jira work.';
  detailNode.replaceChildren();
  fields.forEach((label, index) => {
    const item = document.createElement('div');
    item.className = 'record-field';
    const key = document.createElement('span');
    key.textContent = label;
    const value = document.createElement('b');
    value.textContent = record[index + 1] || '—';
    item.append(key, value);
    detailNode.append(item);
  });

  relatedNode.replaceChildren();
  const relatedRecords = getRelatedRecords(viewName, record[0], demoRows);
  relatedRecords.forEach((related) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'related-record';
    button.dataset.relatedView = related.view;
    button.dataset.relatedReference = related.reference;
    const relation = document.createElement('span');
    relation.textContent = related.relationship;
    const name = document.createElement('b');
    name.textContent = related.title;
    const ref = document.createElement('small');
    ref.textContent = related.reference;
    button.append(relation, name, ref);
    relatedNode.append(button);
  });
  const relatedSection = document.getElementById('record-dialog-related-section');
  relatedSection.hidden = relatedRecords.length === 0;
  dialog.showModal();
}

function setView(nextView) {
  if (!labels[nextView]) return;
  title.textContent = labels[nextView];
  document.querySelectorAll('.nav-item').forEach((button) => {
    const isCurrent = button.dataset.view === nextView;
    button.classList.toggle('active', isCurrent);
    if (isCurrent) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const isOverview = nextView === 'overview';
  overviewNodes.forEach((node) => { node.hidden = !isOverview; });
  secondaryView.hidden = isOverview;
  if (!isOverview) renderTable(nextView);
}

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

document.getElementById('record-dialog-close').addEventListener('click', () => {
  document.getElementById('record-dialog').close();
});

document.getElementById('record-dialog-related').addEventListener('click', (event) => {
  const button = event.target.closest('[data-related-view]');
  if (!button) return;
  const nextView = button.dataset.relatedView;
  const reference = button.dataset.relatedReference;
  const record = demoRows[nextView]?.find((candidate) => candidate[0] === reference);
  if (!record) return;
  document.getElementById('record-dialog').close();
  setView(nextView);
  openRecordDetails(nextView, record);
});

document.getElementById('refresh').addEventListener('click', async () => {
  await loadContext();
  notify('Workspace context refreshed. Procurement data remains in preview mode.');
});

async function loadContext() {
  connectionLabel.textContent = 'Checking Forge connection…';
  connectionLabel.dataset.state = 'checking';
  try {
    const health = await invoke('getHealth');
    if (health?.status === 'scaffold') {
      connectionLabel.textContent = 'Forge connected · integrations pending';
      connectionLabel.dataset.state = 'connected';
    } else {
      connectionLabel.textContent = 'Forge status unavailable';
      connectionLabel.dataset.state = 'warning';
    }
    const context = await view.getContext();
    const projectKey = context?.extension?.project?.key;
    if (projectKey) projectChip.textContent = `Jira project · ${projectKey}`;
    const project = await invoke('getProjectContext');
    if (project?.projectKey) projectChip.textContent = `Jira project · ${project.projectKey}`;
  } catch (error) {
    connectionLabel.textContent = 'Open inside Jira to connect';
    connectionLabel.dataset.state = 'warning';
    console.info('Forge/Jira context is unavailable outside Forge.', error);
  }
}

loadContext();
