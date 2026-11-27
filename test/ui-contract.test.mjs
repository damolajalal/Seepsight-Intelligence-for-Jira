import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('dashboard exposes labelled navigation and current-page state', async () => {
  const html = await read('../static/dashboard/index.html');
  assert.match(html, /<nav class="nav" aria-label="Main navigation">/);
  assert.match(html, /data-view="overview" aria-current="page"/);
  for (const view of ['investigations', 'findings', 'suppliers', 'actions']) {
    assert.match(html, new RegExp(`data-view="${view}"`));
  }
});

test('dashboard refresh control has an explicit accessible name', async () => {
  const html = await read('../static/dashboard/index.html');
  assert.match(html, /id="refresh" type="button" aria-label="Refresh Jira project context"/);
});

test('related-record navigation keeps the dialog open for a continuous review flow', async () => {
  const app = await read('../static/dashboard/app.js');
  assert.match(app, /if \(!dialog\.open\) dialog\.showModal\(\)/);
  assert.match(app, /setView\(nextView\);\s*dialogFallbackFocus = document\.querySelector\(`\.nav-item\[data-view="\$\{nextView\}"\]`\);\s*openRecordDetails\(nextView, record\);/);
  assert.doesNotMatch(app, /record-dialog'\)\.close\(\);\s*setView\(nextView\)/);
});

test('dashboard record dialog has an accessible name and close control', async () => {
  const html = await read('../static/dashboard/index.html');
  assert.match(html, /<dialog id="record-dialog"[^>]*aria-labelledby="record-dialog-title"/);
  assert.match(html, /id="record-dialog-title"/);
  assert.match(html, /id="record-dialog-close" type="button" aria-label="Close details"/);
});

test('dashboard and issue panel explicitly identify preview-only content', async () => {
  const [dashboard, issuePanel] = await Promise.all([
    read('../static/dashboard/index.html'),
    read('../static/issue-panel/index.html')
  ]);
  assert.match(dashboard, /Preview workspace/);
  assert.match(dashboard, /illustrative sample data, not live procurement findings/);
  assert.match(issuePanel, /SAMPLE ONLY/);
  assert.match(issuePanel, /No live procurement evidence · No Jira changes made/);
});

test('issue panel exposes accessible evidence progress and review status', async () => {
  const html = await read('../static/issue-panel/index.html');
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /aria-valuemax="3"/);
  assert.match(html, /id="review-message" role="status" aria-live="polite"/);
  assert.match(html, /id="review-button" type="button" aria-pressed="false"/);
});

test('interactive apps avoid injecting record content through innerHTML', async () => {
  const [dashboard, issuePanel] = await Promise.all([
    read('../static/dashboard/app.js'),
    read('../static/issue-panel/app.js')
  ]);
  assert.doesNotMatch(dashboard, /\.innerHTML\s*=/);
  assert.doesNotMatch(issuePanel, /\.innerHTML\s*=/);
});

test('issue panel supports comfortable touch targets and reduced-motion preferences', async () => {
  const css = await read('../static/issue-panel/styles.css');
  assert.match(css, /\.evidence-check input\{width:18px;height:18px\}/);
  assert.match(css, /#review-button\{min-height:40px/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:reduce\)/);
});

test('dashboard provides keyboard skip navigation and a main landmark target', async () => {
  const html = await read('../static/dashboard/index.html');
  const css = await read('../static/dashboard/styles.css');
  assert.match(html, /<a class="skip-link" href="#main-content">Skip to main content<\/a>/);
  assert.match(html, /<main class="main" id="main-content" tabindex="-1">/);
  assert.match(css, /\.skip-link:focus\{transform:translateY\(0\)/);
});

test('dashboard navigation glyphs are hidden from assistive technology', async () => {
  const html = await read('../static/dashboard/index.html');
  assert.equal((html.match(/<span aria-hidden="true">/g) || []).length, 5);
});

test('dashboard record dialog describes its content and focuses a clear close control', async () => {
  const html = await read('../static/dashboard/index.html');
  assert.match(html, /aria-describedby="record-dialog-summary"/);
  assert.match(html, /id="record-dialog-close" type="button" aria-label="Close details" autofocus/);
});

test('related-record navigation restores focus to the current section after closing', async () => {
  const app = await read('../static/dashboard/app.js');
  assert.match(app, /let dialogFallbackFocus = null/);
  assert.match(app, /const focusTarget = dialogOpener\?\.isConnected \? dialogOpener : dialogFallbackFocus/);
  assert.match(app, /dialogFallbackFocus = document\.querySelector\(\`.nav-item\[data-view=/);
  assert.match(app, /else titleNode\.focus\(\)/);
});

test('record dialog title is a programmatic focus target', async () => {
  const html = await read('../static/dashboard/index.html');
  assert.match(html, /id="record-dialog-title" tabindex="-1"/);
});


test('dashboard refresh reports failures and prevents overlapping requests', async () => {
  const app = await read('../static/dashboard/app.js');
  assert.match(app, /const refreshed = await loadContext\(\)/);
  assert.match(app, /Could not refresh Jira context/);
  assert.match(app, /refreshButton\.disabled = true/);
  assert.match(app, /refreshButton\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(app, /refreshButton\.disabled = false/);
  assert.match(app, /refreshButton\.removeAttribute\('aria-busy'\)/);
  assert.match(app, /return true;[\s\S]*catch \(error\)[\s\S]*return false;/);
});

test('dashboard connection state is announced to assistive technology', async () => {
  const html = await read('../static/dashboard/index.html');
  assert.match(html, /id="connection-label" role="status" aria-live="polite"/);
});

test('dashboard and issue panel define narrow-screen layouts', async () => {
  const [dashboard, issuePanel] = await Promise.all([
    read('../static/dashboard/styles.css'),
    read('../static/issue-panel/styles.css')
  ]);
  assert.match(dashboard, /@media\(max-width:620px\)/);
  assert.match(dashboard, /\.shell\{display:block\}/);
  assert.match(dashboard, /\.nav\{display:flex;overflow-x:auto/);
  assert.match(issuePanel, /@media\(max-width:430px\)/);
  assert.match(issuePanel, /\.review-controls\{align-items:flex-start;flex-direction:column/);
});


test('issue panel presents a quantified sample variance with a verification caveat', async () => {
  const html = await read('../static/issue-panel/index.html');
  assert.match(html, /1,000 ordered − 800 received = 200 units to investigate/);
  assert.match(html, /₦4,800,000/);
  assert.match(html, /not a confirmed loss/);
  assert.match(html, /verify signed source documents/);
});
