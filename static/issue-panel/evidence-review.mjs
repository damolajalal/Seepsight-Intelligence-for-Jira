export function toggleEvidence(reviewedIds, evidenceId) {
  const next = new Set(reviewedIds);
  if (next.has(evidenceId)) next.delete(evidenceId);
  else next.add(evidenceId);
  return [...next];
}

export function getEvidenceSummary(evidence, reviewedIds) {
  const reviewed = new Set(reviewedIds);
  const reviewedCount = evidence.filter((item) => reviewed.has(item.id)).length;
  return {
    reviewed: reviewedCount,
    total: evidence.length,
    complete: evidence.length > 0 && reviewedCount === evidence.length
  };
}
