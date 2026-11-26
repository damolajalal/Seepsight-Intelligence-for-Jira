import test from 'node:test';
import assert from 'node:assert/strict';
import { createHealthPayload } from '../src/health-status.mjs';

test('health payload identifies the Jira Forge scaffold', () => {
  const health = createHealthPayload();
  assert.equal(health.status, 'scaffold');
  assert.equal(health.product, 'Seepsight Intelligence for Jira');
  assert.equal(health.integrations.jira, 'forge-resolver');
});

test('external integrations remain explicitly unconfigured', () => {
  const { integrations } = createHealthPayload();
  for (const name of ['seepsight', 'gemini', 'rovo', 'nvidia']) {
    assert.equal(integrations[name], 'not-configured');
  }
});
