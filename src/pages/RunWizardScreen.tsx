import { ChangeEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClickUpClient } from '../clickup-client.js';
import { CreationPipelineService } from '../creation-pipeline.js';
import { DestinationService } from '../destination-service.js';
import { parseExcelWorkbook } from '../parsing/excelParser';
import { parseDocxTemplate } from '../parsing/wordParser';
import { useAppState, WizardStep } from '../state/AppStateContext';

const localSettingsStore = {
  async set(key: string, value: string) {
    localStorage.setItem(`mlp_to_clickup_${key}`, value);
  },
  async get(key: string) {
    return localStorage.getItem(`mlp_to_clickup_${key}`);
  }
};

const wizardSteps: Array<{ id: WizardStep; label: string }> = [
  { id: 'source', label: '1. Source files' },
  { id: 'mapping', label: '2. Destination & preflight' },
  { id: 'review', label: '3. Unresolved media type decisions' },
  { id: 'execute', label: '4. Execute run' }
];

export function RunWizardScreen() {
  const navigate = useNavigate();
  const { settings, runState, updateRunState, wizardStep, setWizardStep } = useAppState();
  const [statusMessage, setStatusMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const clickUpClient = useMemo(() => {
    if (!settings.clickUpToken) {
      return null;
    }
    return new ClickUpClient({ token: settings.clickUpToken });
  }, [settings.clickUpToken]);

  const destinationService = useMemo(() => {
    if (!clickUpClient) {
      return null;
    }
    return new DestinationService(clickUpClient, localSettingsStore);
  }, [clickUpClient]);

  const pipelineService = useMemo(() => {
    if (!clickUpClient) {
      return null;
    }
    return new CreationPipelineService(clickUpClient);
  }, [clickUpClient]);

  const onExcelFilePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsBusy(true);
    setStatusMessage('Parsing Excel workbook...');

    const buffer = await file.arrayBuffer();
    const parsed = parseExcelWorkbook(buffer);

    if (parsed.blockingErrors.length > 0) {
      setStatusMessage(parsed.blockingErrors.join(' '));
      setIsBusy(false);
      return;
    }

    updateRunState({
      excelFileName: file.name,
      parsedVideos: parsed.rows.map((row) => ({
        videoNumber: row.videoNumberNormalized,
        lectureName: row.lectureName,
        mediaType: row.lectureType
      }))
    });

    setStatusMessage(
      `Excel parsed: ${parsed.rows.length} rows. ${parsed.warnings.length} warnings, ${parsed.unknownMediaTypes.length} unknown media types detected locally.`
    );
    setWizardStep('mapping');
    setIsBusy(false);
  };

  const onDocxFilePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsBusy(true);
    setStatusMessage('Parsing DOCX template...');

    const buffer = await file.arrayBuffer();
    const parsed = await parseDocxTemplate(buffer);

    if (parsed.blockingErrors.length > 0) {
      setStatusMessage(parsed.blockingErrors.join(' '));
      setIsBusy(false);
      return;
    }

    updateRunState({
      docxFileName: file.name,
      wordMetadata: {
        objective: parsed.labels.Objective ?? '',
        prerequisites: parsed.labels.Prerequisites ?? '',
        outcomes: (parsed.labels.Outcomes ?? '')
          .split(/\n|;/)
          .map((item) => item.trim())
          .filter(Boolean),
        notes: parsed.notes
      }
    });

    setStatusMessage(
      `DOCX parsed. ${parsed.missingFieldWarnings.length} missing-field warnings.`
    );
    setIsBusy(false);
  };

  const onValidateDestinationAndPreflight = async () => {
    if (!destinationService || !pipelineService) {
      setStatusMessage('Validate token in Settings before browsing destination.');
      return;
    }

    const { workspaceId, spaceId, folderId } = runState.destinationSelection;
    if (!workspaceId || !spaceId || !folderId) {
      setStatusMessage('Pick workspace, space, and folder IDs first.');
      return;
    }

    setIsBusy(true);
    try {
      const destination = await destinationService.validateDestination(
        workspaceId,
        spaceId,
        folderId
      );
      const preflight = await pipelineService.preflight(
        destination.list.id,
        runState.parsedVideos
      );

      updateRunState({ validatedDestination: destination, preflight });
      setStatusMessage(
        preflight.canProceed
          ? 'Destination validated and preflight passed.'
          : `Preflight found ${preflight.unresolvedMediaTypes.length} unresolved media type values.`
      );
      setWizardStep(preflight.canProceed ? 'execute' : 'review');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Destination validation failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const onExecuteRun = async () => {
    if (!pipelineService || !runState.validatedDestination) {
      setStatusMessage('Complete destination validation before execution.');
      return;
    }

    if (!runState.preflight?.canProceed && Object.keys(runState.mediaTypeDecisions).length === 0) {
      setStatusMessage('Resolve unresolved media type decisions first.');
      return;
    }

    setIsBusy(true);
    setStatusMessage('Running creation pipeline...');

    try {
      const result = await pipelineService.run({
        destination: runState.validatedDestination,
        assignments: {
          mediaLeadAssigneeId: 'me',
          developmentLeadAssigneeId: 'me'
        },
        videos: runState.parsedVideos,
        wordMetadata: runState.wordMetadata,
        mediaTypeDecisions: runState.mediaTypeDecisions
      });

      updateRunState({ lastRunResult: result });
      setStatusMessage(`Run completed with ${result.successCount} created and ${result.failureCount} errors.`);
      navigate('/results');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Run failed unexpectedly.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section>
      <h2>Run Wizard</h2>
      <div className="wizard-grid">
        {wizardSteps.map((step) => {
          const isActive = step.id === wizardStep;
          return (
            <button
              key={step.id}
              type="button"
              className={isActive ? 'wizard-step active' : 'wizard-step'}
              onClick={() => setWizardStep(step.id)}
            >
              <strong>{step.label}</strong>
            </button>
          );
        })}
      </div>

      <div className="stack" style={{ marginTop: '1rem' }}>
        <label>
          Excel source (.xlsx)
          <input type="file" accept=".xlsx,.xls" onChange={onExcelFilePicked} disabled={isBusy} />
        </label>
        <div>Selected: {runState.excelFileName || 'None'}</div>

        <label>
          DOCX template (.docx)
          <input type="file" accept=".docx" onChange={onDocxFilePicked} disabled={isBusy} />
        </label>
        <div>Selected: {runState.docxFileName || 'None'}</div>
      </div>

      <h3>Destination</h3>
      <div className="stack">
        <label>
          Workspace ID
          <input
            value={runState.destinationSelection.workspaceId}
            onChange={(event) =>
              updateRunState({
                destinationSelection: {
                  ...runState.destinationSelection,
                  workspaceId: event.target.value
                }
              })
            }
          />
        </label>
        <label>
          Space ID
          <input
            value={runState.destinationSelection.spaceId}
            onChange={(event) =>
              updateRunState({
                destinationSelection: {
                  ...runState.destinationSelection,
                  spaceId: event.target.value
                }
              })
            }
          />
        </label>
        <label>
          Folder ID
          <input
            value={runState.destinationSelection.folderId}
            onChange={(event) =>
              updateRunState({
                destinationSelection: {
                  ...runState.destinationSelection,
                  folderId: event.target.value
                }
              })
            }
          />
        </label>
        <button type="button" onClick={onValidateDestinationAndPreflight} disabled={isBusy}>
          Validate destination + preflight
        </button>
      </div>

      {runState.preflight?.unresolvedMediaTypes?.length ? (
        <>
          <h3>Unresolved media type decisions</h3>
          <div className="stack">
            {runState.preflight.unresolvedMediaTypes.map((item) => {
              const key = item.inputValue.toLowerCase();
              const current = runState.mediaTypeDecisions[key];
              return (
                <div key={item.inputValue} className="wizard-step">
                  <strong>{item.inputValue}</strong>
                  <label>
                    Decision
                    <select
                      value={current?.action ?? 'skip_field'}
                      onChange={(event) => {
                        const action = event.target.value as 'map_manual' | 'skip_field';
                        updateRunState({
                          mediaTypeDecisions: {
                            ...runState.mediaTypeDecisions,
                            [key]: {
                              ...current,
                              action,
                              optionId: action === 'map_manual' ? current?.optionId ?? '' : undefined
                            }
                          }
                        });
                      }}
                    >
                      <option value="skip_field">Skip Media Type field</option>
                      <option value="map_manual">Map to existing option</option>
                    </select>
                  </label>
                  {current?.action === 'map_manual' ? (
                    <label>
                      Map to option
                      <select
                        value={current.optionId ?? ''}
                        onChange={(event) => {
                          const optionId = event.target.value;
                          const matched = item.options.find((option) => option.id === optionId);
                          updateRunState({
                            mediaTypeDecisions: {
                              ...runState.mediaTypeDecisions,
                              [key]: {
                                action: 'map_manual',
                                optionId,
                                optionName: matched?.name
                              }
                            }
                          });
                        }}
                      >
                        <option value="">Choose one</option>
                        {item.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <button type="button" style={{ marginTop: '1rem' }} onClick={onExecuteRun} disabled={isBusy}>
        Execute run
      </button>
      {statusMessage ? <p>{statusMessage}</p> : null}
    </section>
  );
}
