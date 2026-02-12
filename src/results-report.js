export function buildResultsReport(result) {
  return {
    summary: `${result.successCount} tasks/subtasks created, ${result.failureCount} failures.`,
    createdLinks: result.created.map((entry) => `${entry.name}: ${entry.url}`),
    retryableFailures: result.errors,
  };
}
