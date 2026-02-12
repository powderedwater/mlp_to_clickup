import { useAppState, WizardStep } from '../state/AppStateContext';

const wizardSteps: Array<{ id: WizardStep; label: string; description: string }> = [
  {
    id: 'source',
    label: '1. Select Source',
    description: 'Choose and validate your MLP export input.'
  },
  {
    id: 'mapping',
    label: '2. Map Fields',
    description: 'Define field mapping between MLP entities and ClickUp tasks.'
  },
  {
    id: 'review',
    label: '3. Review Plan',
    description: 'Confirm transformation settings and migration summary.'
  },
  {
    id: 'execute',
    label: '4. Execute Run',
    description: 'Start the migration run and stream progress updates.'
  }
];

export function RunWizardScreen() {
  const { wizardStep, setWizardStep } = useAppState();

  return (
    <section>
      <h2>Run Wizard</h2>
      <p>Placeholder navigation for the required wizard steps.</p>
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
              <span>{step.description}</span>
            </button>
          );
        })}
      </div>
      <div className="wizard-state">
        Current step: <code>{wizardStep}</code>
      </div>
    </section>
  );
}
