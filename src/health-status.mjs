export function createHealthPayload() {
  return {
    status: 'scaffold',
    product: 'Seepsight Intelligence for Jira',
    integrations: {
      jira: 'forge-resolver',
      seepsight: 'not-configured',
      gemini: 'not-configured',
      rovo: 'not-configured',
      nvidia: 'not-configured'
    }
  };
}
