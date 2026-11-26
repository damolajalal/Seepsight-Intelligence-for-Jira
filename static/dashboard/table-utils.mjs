export function filterRecords(rows, query) {
  const normalized = String(query ?? '').trim().toLocaleLowerCase();
  return rows.map((record, index) => ({
    index,
    matches: !normalized || record.join(' ').toLocaleLowerCase().includes(normalized)
  }));
}

export function getVisibleRecordCount(filteredRecords) {
  return filteredRecords.reduce((count, item) => count + (item.matches ? 1 : 0), 0);
}
