import { view } from '@forge/bridge';

const title = document.getElementById('page-title');
const toast = document.getElementById('toast');
const projectChip = document.getElementById('project-chip');
const labels = { overview: 'Overview', investigations: 'Investigations', findings: 'Findings', suppliers: 'Suppliers', actions: 'Actions' };

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(window.__toastTimer);
  window.__toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function setView(nextView) {
  if (!labels[nextView]) return;
  title.textContent = labels[nextView];
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === nextView);
  });
  if (nextView !== 'overview') notify(`${labels[nextView]} workspace is scaffolded; its data workflow is being built.`);
}

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

document.getElementById('refresh').addEventListener('click', () => {
  notify('Preview refreshed. Live procurement data is not connected yet.');
});

async function loadContext() {
  try {
    const context = await view.getContext();
    const projectKey = context?.extension?.project?.key;
    if (projectKey) projectChip.textContent = `Jira project · ${projectKey}`;
  } catch (error) {
    console.info('Jira project context is unavailable outside Forge.', error);
  }
}

loadContext();
