import { view, invoke } from '@forge/bridge';

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
  const header = headings.map((heading) => `<th>${heading}</th>`).join('');
  const body = rows.map((row, index) => {
    const cells = row.map((cell, cellIndex) => {
      if (cellIndex === 3 && viewName !== 'actions') {
        const riskClass = String(cell).toLowerCase().includes('high') ? 'risk-high' : 'risk-medium';
        return `<td><span class="${riskClass}">${cell}</span></td>`;
      }
      return `<td>${cell}</td>`;
    }).join('');
    const action = viewName === 'actions'
      ? `<td><button class="row-action" data-complete="${index}">Mark complete</button></td>`
      : '';
    return `<tr>${cells}${action}</tr>`;
  }).join('');
  const actionHeader = viewName === 'actions' ? '<th>UPDATE</th>' : '';
  secondaryView.innerHTML = `
    <div class="panel-head"><div><span class="eyebrow">PREVIEW DATA · NOT LIVE</span><h2>${labels[viewName]}</h2></div><span class="pill">Illustrative sample</span></div>
    <div class="table-wrap"><table><thead><tr>${header}${actionHeader}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="view-note">These sample records demonstrate the intended workflow. Verified Seepsight records will replace them after the secure backend connection is configured.</p>`;
  secondaryView.querySelectorAll('[data-complete]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('tr');
      row.lastElementChild.innerHTML = '<span class="status">Completed locally</span>';
      button.remove();
      notify('Sample action marked complete in this preview only.');
    });
  });
}

function setView(nextView) {
  if (!labels[nextView]) return;
  title.textContent = labels[nextView];
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === nextView);
  });
  const isOverview = nextView === 'overview';
  overviewNodes.forEach((node) => { node.hidden = !isOverview; });
  secondaryView.hidden = isOverview;
  if (!isOverview) renderTable(nextView);
}

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
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
