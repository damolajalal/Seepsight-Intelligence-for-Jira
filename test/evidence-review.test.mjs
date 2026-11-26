import test from 'node:test';
import assert from 'node:assert/strict';
import { getEvidenceSummary, toggleEvidence } from '../static/issue-panel/evidence-review.mjs';

const evidence = [
  { id: 'purchase-order' },
  { id: 'delivery-confirmation' },
  { id: 'goods-received-note' }
];

test('evidence summary starts with all items awaiting review', () => {
  assert.deepEqual(getEvidenceSummary(evidence, []), { reviewed: 0, total: 3, complete: false });
});

test('evidence can be checked and unchecked without mutating prior state', () => {
  const current = ['purchase-order'];
  const next = toggleEvidence(current, 'delivery-confirmation');
  assert.deepEqual(current, ['purchase-order']);
  assert.deepEqual(next, ['purchase-order', 'delivery-confirmation']);
  assert.deepEqual(toggleEvidence(next, 'purchase-order'), ['delivery-confirmation']);
});

test('review is complete only when every required evidence item is checked', () => {
  assert.equal(getEvidenceSummary(evidence, ['purchase-order', 'delivery-confirmation']).complete, false);
  assert.equal(getEvidenceSummary(evidence, evidence.map((item) => item.id)).complete, true);
});

test('empty evidence cannot be treated as a completed review', () => {
  assert.equal(getEvidenceSummary([], []).complete, false);
});
