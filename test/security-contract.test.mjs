import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Forge manifest requests only the Jira read scope required by the preview', async () => {
  const manifest = await read('../manifest.yml');
  const scopeBlock = manifest.match(/permissions:\s*\n\s+scopes:([\s\S]*?)(?:\n\S|$)/)?.[1] ?? '';
  const scopes = [...scopeBlock.matchAll(/^\s+-\s+([^\s#]+)/gm)].map((match) => match[1]);
  assert.deepEqual(scopes, ['read:jira-work']);
  assert.doesNotMatch(scopeBlock, /write:jira-work|manage:jira|write:|delete:/i);
});

test('Jira issue resolver uses the current user and requests a minimal field allowlist', async () => {
  const resolver = await read('../src/index.js');
  assert.match(resolver, /api\.asUser\(\)\.requestJira/);
  assert.match(resolver, /fields=summary,status,issuetype,assignee/);
  assert.doesNotMatch(resolver, /api\.asApp\(\)\.requestJira/);
});

test('resolver maps failures to safe messages rather than exposing raw errors', async () => {
  const resolver = await read('../src/index.js');
  assert.match(resolver, /getIssueLoadError\(response\?\.status\)/);
  assert.match(resolver, /Unable to contact Jira right now\. Please try again\./);
  assert.doesNotMatch(resolver, /error\.message|response\.text\(\)|JSON\.stringify\(error\)/);
});

test('Forge bridge mock is enabled only for an explicit test build', async () => {
  const build = await read('../scripts/build-ui.mjs');
  assert.match(build, /process\.env\.FORGE_BRIDGE_MOCK === 'true'/);
  assert.match(build, /test\/fixtures\/forge-bridge\.mjs/);
  assert.doesNotMatch(build, /FORGE_BRIDGE_MOCK\s*=\s*true/);
});

test('preview surfaces clearly disclose sample-only data and non-persistent actions', async () => {
  const [dashboard, issuePanel] = await Promise.all([
    read('../static/dashboard/index.html'),
    read('../static/issue-panel/index.html')
  ]);
  assert.match(dashboard, /illustrative sample data, not live procurement findings/);
  assert.match(issuePanel, /No live procurement evidence · No Jira changes made/);
});
