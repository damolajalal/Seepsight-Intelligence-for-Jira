import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRecords, getVisibleRecordCount } from '../static/dashboard/table-utils.mjs';

const records = [
  ['INV-024', 'Delivery quantity mismatch', 'Northstar Supplies'],
  ['INV-023', 'Unit price variance', 'Greenfield Trading'],
  ['INV-021', 'Approval cycle delay', 'Westline Partners']
];

test('empty filter matches every sample record', () => {
  const filtered = filterRecords(records, '');
  assert.deepEqual(filtered.map((item) => item.matches), [true, true, true]);
  assert.equal(getVisibleRecordCount(filtered), 3);
});

test('filter matches case-insensitively across all record fields', () => {
  const filtered = filterRecords(records, 'GREENFIELD');
  assert.deepEqual(filtered.map((item) => item.matches), [false, true, false]);
  assert.equal(getVisibleRecordCount(filtered), 1);
});

test('filter trims surrounding whitespace and reports zero matches', () => {
  const filtered = filterRecords(records, '  missing supplier  ');
  assert.deepEqual(filtered.map((item) => item.matches), [false, false, false]);
  assert.equal(getVisibleRecordCount(filtered), 0);
});

test('nullish query is treated as an empty filter', () => {
  assert.equal(getVisibleRecordCount(filterRecords(records, null)), 3);
});
