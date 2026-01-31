import type { ScenarioConfig } from '../types/scenario';
import { getAllScenarios } from '../config/scenarios';

interface ScenarioSelectorProps {
  selectedId: string | null;
  onSelect: (scenario: ScenarioConfig) => void;
  disabled?: boolean;
}

export function ScenarioSelector({ selectedId, onSelect, disabled }: ScenarioSelectorProps) {
  const scenarios = getAllScenarios();

  return (
    <div className="scenario-selector" role="radiogroup" aria-label="选择场景">
      <h3>选择场景</h3>
      <div className="scenario-list">
        {scenarios.map((scenario) => (
          <label
            key={scenario.id}
            className={`scenario-item ${selectedId === scenario.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          >
            <input
              type="radio"
              name="scenario"
              value={scenario.id}
              checked={selectedId === scenario.id}
              onChange={() => onSelect(scenario)}
              disabled={disabled}
            />
            <span>{scenario.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
