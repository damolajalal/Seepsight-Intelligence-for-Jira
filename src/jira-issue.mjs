const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9_]*-\d+$/;

function safeText(value, fallback, maxLength = 300) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

export function isValidJiraIssueKey(value) {
  return typeof value === 'string' && ISSUE_KEY_PATTERN.test(value);
}

export function getIssueLoadError(status) {
  if (status === 401 || status === 403) {
    return 'You do not have permission to view this Jira issue.';
  }
  if (status === 404) {
    return 'This Jira issue could not be found. It may have been moved or deleted.';
  }
  if (status === 429) {
    return 'Jira is receiving too many requests. Please try again shortly.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'Jira is temporarily unavailable. Please try again later.';
  }
  return 'Unable to load this Jira issue. Please try again.';
}

export function normaliseJiraIssue(issue, requestedIssueKey) {
  if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
    return null;
  }

  const fields = issue.fields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return null;
  }

  return {
    key: safeText(issue.key, requestedIssueKey, 100),
    summary: safeText(fields.summary, 'No summary available'),
    status: safeText(fields.status?.name, 'Unknown', 100),
    issueType: safeText(fields.issuetype?.name, 'Unknown', 100),
    assignee: safeText(fields.assignee?.displayName, 'Unassigned', 100)
  };
}
