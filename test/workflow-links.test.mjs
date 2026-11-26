import test from 'node:test';
import assert from 'node:assert/strict';
import { getRelatedRecords } from '../static/dashboard/workflow-links.mjs';

const records = {
  investigations: [['INV-024', 'Delivery quantity mismatch']],
  findings: [['FND-108', 'Delivered quantity below purchase order']],
  suppliers: [['SUP-014', 'Northstar Supplies']],
  actions: [['ACT-032', 'Confirm delivery note and received quantity']]
};

test('investigation detail resolves its finding, supplier, and action', () => {
  const related = getRelatedRecords('investigations', 'INV-024', records);
  assert.deepEqual(related.map(({ view, reference }) => [view, reference]), [
    ['findings', 'FND-108'],
    ['suppliers', 'SUP-014'],
    ['actions', 'ACT-032']
  ]);
  assert.equal(related[0].title, 'Delivered quantity below purchase order');
});

test('unknown records and missing linked records return no relationships', () => {
  assert.deepEqual(getRelatedRecords('investigations', 'INV-999', records), []);
  assert.deepEqual(getRelatedRecords('investigations', 'INV-024', {}), []);
});

test('relationship labels are included for reviewer context', () => {
  const related = getRelatedRecords('findings', 'FND-108', records);
  assert.deepEqual(related.map((item) => item.relationship), [
    'Investigation', 'Supplier', 'Follow-up action'
  ]);
});
