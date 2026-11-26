const relationships = {
  investigations: {
    'INV-024': [['findings', 'FND-108', 'Related finding'], ['suppliers', 'SUP-014', 'Supplier'], ['actions', 'ACT-032', 'Follow-up action']],
    'INV-023': [['findings', 'FND-106', 'Related finding'], ['suppliers', 'SUP-011', 'Supplier'], ['actions', 'ACT-029', 'Follow-up action']],
    'INV-021': [['findings', 'FND-102', 'Related finding'], ['suppliers', 'SUP-008', 'Supplier'], ['actions', 'ACT-025', 'Follow-up action']],
    'INV-019': [['suppliers', 'SUP-014', 'Supplier']]
  },
  findings: {
    'FND-108': [['investigations', 'INV-024', 'Investigation'], ['suppliers', 'SUP-014', 'Supplier'], ['actions', 'ACT-032', 'Follow-up action']],
    'FND-106': [['investigations', 'INV-023', 'Investigation'], ['suppliers', 'SUP-011', 'Supplier'], ['actions', 'ACT-029', 'Follow-up action']],
    'FND-102': [['investigations', 'INV-021', 'Investigation'], ['suppliers', 'SUP-008', 'Supplier'], ['actions', 'ACT-025', 'Follow-up action']]
  },
  suppliers: {
    'SUP-014': [['investigations', 'INV-024', 'Investigation'], ['findings', 'FND-108', 'Finding'], ['actions', 'ACT-032', 'Follow-up action']],
    'SUP-011': [['investigations', 'INV-023', 'Investigation'], ['findings', 'FND-106', 'Finding'], ['actions', 'ACT-029', 'Follow-up action']],
    'SUP-008': [['investigations', 'INV-021', 'Investigation'], ['findings', 'FND-102', 'Finding'], ['actions', 'ACT-025', 'Follow-up action']]
  },
  actions: {
    'ACT-032': [['investigations', 'INV-024', 'Investigation'], ['findings', 'FND-108', 'Finding'], ['suppliers', 'SUP-014', 'Supplier']],
    'ACT-029': [['investigations', 'INV-023', 'Investigation'], ['findings', 'FND-106', 'Finding'], ['suppliers', 'SUP-011', 'Supplier']],
    'ACT-025': [['investigations', 'INV-021', 'Investigation'], ['findings', 'FND-102', 'Finding'], ['suppliers', 'SUP-008', 'Supplier']]
  }
};

export function getRelatedRecords(viewName, reference, records) {
  const links = relationships[viewName]?.[reference] || [];
  return links.flatMap(([view, ref, relationship]) => {
    const record = records[view]?.find((candidate) => candidate[0] === ref);
    return record ? [{ view, reference: ref, relationship, title: record[1] }] : [];
  });
}
