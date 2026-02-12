import { buildResultsReport } from '../results-report.js';
import { useAppState } from '../state/AppStateContext';

export function ResultsScreen() {
  const { runState } = useAppState();

  if (!runState.lastRunResult) {
    return (
      <section>
        <h2>Results</h2>
        <p>No run has executed yet.</p>
      </section>
    );
  }

  const report = buildResultsReport(runState.lastRunResult);

  return (
    <section>
      <h2>Results</h2>
      <p>{report.summary}</p>

      <h3>Created tasks</h3>
      {runState.lastRunResult.created.length === 0 ? (
        <p>No task links available.</p>
      ) : (
        <ul>
          {runState.lastRunResult.created.map((entry) => (
            <li key={entry.taskId}>
              <a href={entry.url} target="_blank" rel="noreferrer">
                {entry.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      <h3>Report link lines</h3>
      <ul>
        {report.createdLinks.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <h3>Errors</h3>
      {report.retryableFailures.length === 0 ? (
        <p>No errors.</p>
      ) : (
        <ul>
          {report.retryableFailures.map((error, index) => (
            <li key={`${error.stage}-${index}`}>
              <strong>{error.stage}:</strong> {error.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
