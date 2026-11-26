async function loadIssue(){
  const state=document.getElementById('state');
  try{
    if(!window.forge?.bridge?.invoke){state.textContent='Jira context bridge is not available in this preview.';return}
    const result=await window.forge.bridge.invoke('getCurrentIssue');
    if(result?.issue){
      document.getElementById('issue-title').textContent=result.issue.summary||'Untitled Jira issue';
      document.getElementById('issue-key').textContent=result.issue.key;
      document.getElementById('issue-status').textContent=result.issue.status;
      state.textContent='Jira issue context loaded. Seepsight data connection is the next integration step.';
    }else{state.textContent=result?.error||'Open this panel from a Jira issue to load its context.'}
  }catch(error){state.textContent='Issue context is not available yet. Confirm Forge deployment and permissions.';console.error(error)}
}
loadIssue();
