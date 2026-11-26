const title = document.getElementById('page-title');
const toast = document.getElementById('toast');
const projectChip = document.getElementById('project-chip');
const labels = {overview:'Overview',investigations:'Investigations',findings:'Findings',suppliers:'Suppliers',actions:'Actions'};
function notify(message){toast.textContent=message;toast.classList.add('show');clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>toast.classList.remove('show'),2600)}
function setView(view){if(!labels[view])return;title.textContent=labels[view];document.querySelectorAll('.nav-item').forEach(button=>button.classList.toggle('active',button.dataset.view===view));if(view!=='overview')notify(labels[view]+' view is part of the next build phase.')}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
document.getElementById('refresh').addEventListener('click',()=>notify('Preview refreshed. Live data is not connected yet.'));
async function loadContext(){
  try{
    if(!window.forge?.bridge?.getContext)return;
    const context=await window.forge.bridge.getContext();
    const key=context?.extension?.project?.key;
    if(key)projectChip.textContent='Jira project · '+key;
  }catch(error){console.info('Forge context is not available in standalone preview.',error)}
}
loadContext();
