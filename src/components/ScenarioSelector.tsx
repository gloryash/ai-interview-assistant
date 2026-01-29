import type { ScenarioConfig } from '../types/scenario';
import { getAllScenarios } from '../config/scenarios';

interface ScenarioSelectorProps {
  selectedId: string | null;
  onSelect: (scenario: ScenarioConfig) => void;
}

export function ScenarioSelector({ selectedId, onSelect }: ScenarioSelectorProps) {
  const scenarios = getAllScenarios();

  return (
    <div className="scenario-selector">
      <h3>选择场景</h3>
      <div className="scenario-list">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            className={`scenario-item ${selectedId === scenario.id ? 'active' : ''}`}
            onClick={() => onSelect(scenario)}
          >
            {scenario.name}
          </button>
        ))}
      </div>
    </div>
  );
}
