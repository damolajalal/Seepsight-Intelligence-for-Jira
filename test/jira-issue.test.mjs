import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getIssueLoadError,
  isValidJiraIssueKey,
  normaliseJiraIssue
} from '../src/jira-issue.mjs';

test('accepts standard Jira issue keys and rejects malformed values', () => {
  assert.equal(isValidJiraIssueKey('DEMO-101'), true);
  assert.equal(isValidJiraIssueKey('PROCUREMENT_2-7'), true);
  assert.equal(isValidJiraIssueKey(`${'A'.repeat(253)}-1`), true);
  for (const value of ['', 'demo-1', 'DEMO', 'DEMO-1/path', 'A-'.concat('1'.repeat(254)), null, 101]) {
    assert.equal(isValidJiraIssueKey(value), false);
  }
});

test('maps Jira response statuses to safe user-facing messages', () => {
  assert.match(getIssueLoadError(403), /permission/);
  assert.match(getIssueLoadError(404), /could not be found/);
  assert.match(getIssueLoadError(429), /too many requests/);
  assert.match(getIssueLoadError(503), /temporarily unavailable/);
  assert.match(getIssueLoadError(400), /Unable to load/);
});

test('normalises only the supported Jira issue fields', () => {
  const result = normaliseJiraIssue({
    key: 'DEMO-101',
    fields: {
      summary: 'Review procurement evidence',
      status: { name: 'In Progress' },
      issuetype: { name: 'Task' },
      assignee: { displayName: 'Demo Reviewer' },
      description: 'This field must not be returned'
    },
    secret: 'must not be returned'
  }, 'DEMO-101');

  assert.deepEqual(result, {
    key: 'DEMO-101',
    summary: 'Review procurement evidence',
    status: 'In Progress',
    issueType: 'Task',
    assignee: 'Demo Reviewer'
  });
  assert.equal('description' in result, false);
  assert.equal('secret' in result, false);
});

test('keeps the requested Jira issue key if the response contains a different key', () => {
  const result = normaliseJiraIssue({
    key: 'OTHER-999',
    fields: { summary: 'Review procurement evidence' }
  }, 'DEMO-101');
  assert.equal(result.key, 'DEMO-101');
});

test('uses safe fallbacks for missing or malformed Jira fields', () => {
  assert.deepEqual(normaliseJiraIssue({ fields: {} }, 'DEMO-101'), {
    key: 'DEMO-101',
    summary: 'No summary available',
    status: 'Unknown',
    issueType: 'Unknown',
    assignee: 'Unassigned'
  });
  assert.equal(normaliseJiraIssue(null, 'DEMO-101'), null);
  assert.equal(normaliseJiraIssue({ fields: 'invalid' }, 'DEMO-101'), null);
});

test('bounds text returned from Jira', () => {
  const result = normaliseJiraIssue({
    fields: { summary: 'x'.repeat(1000) }
  }, 'DEMO-101');
  assert.equal(result.summary.length, 300);
});
