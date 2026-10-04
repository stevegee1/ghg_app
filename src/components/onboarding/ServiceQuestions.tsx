import React from 'react';
import { FLEET_CATEGORY_LABELS, type FleetAssetCategory } from '../../api/fleet.types';
import { YesNoQuestion } from './YesNoQuestion';
import {
  FLEET_ASSET_COUNT_OPTIONS,
  FLEET_CONNECTION_OPTIONS,
  GHG_QUESTIONS,
  WORKFORCE_QUESTIONS,
  type ClientService,
  type FleetProfileAnswers,
} from './onboardingServices';

export type YesNoAnswers = Record<string, boolean | null>;

interface Props {
  service: ClientService;
  answers: YesNoAnswers;
  onAnswer: (key: string, value: boolean) => void;
  fleet: FleetProfileAnswers;
  onFleetChange: (fleet: FleetProfileAnswers) => void;
}

/** The questions for one service. Only the chosen service's questions are asked. */
export const ServiceQuestions: React.FC<Props> = ({ service, answers, onAnswer, fleet, onFleetChange }) => {
  if (service === 'FLEET') {
    const toggleCategory = (category: FleetAssetCategory) =>
      onFleetChange({
        ...fleet,
        categories: fleet.categories.includes(category)
          ? fleet.categories.filter((c) => c !== category)
          : [...fleet.categories, category],
      });

    return (
      <div className="onb-questions">
        <fieldset className="onb-question">
          <legend className="onb-question-label">How many machines and vehicles do you run?</legend>
          <div className="onb-choice-row">
            {FLEET_ASSET_COUNT_OPTIONS.map((o) => (
              <label key={o.id} className={`onb-yesno-option${fleet.assetCountBand === o.id ? ' is-selected' : ''}`}>
                <input type="radio" name="fleet-count" checked={fleet.assetCountBand === o.id} onChange={() => onFleetChange({ ...fleet, assetCountBand: o.id })} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="onb-question">
          <legend className="onb-question-label">What kinds of equipment do you run?</legend>
          <p className="onb-help">Choose all that apply.</p>
          <div className="onb-check-grid">
            {(Object.keys(FLEET_CATEGORY_LABELS) as FleetAssetCategory[]).map((category) => (
              <label key={category} className={`onb-check${fleet.categories.includes(category) ? ' is-selected' : ''}`}>
                <input type="checkbox" checked={fleet.categories.includes(category)} onChange={() => toggleCategory(category)} />
                <span>{FLEET_CATEGORY_LABELS[category]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="onb-question">
          <legend className="onb-question-label">Do your machines already report data to a manufacturer or telematics platform?</legend>
          <p className="onb-help">We connect connected machines through their platform and fit a tracking device to the others. We confirm each machine with you during setup.</p>
          <div className="onb-stack">
            {FLEET_CONNECTION_OPTIONS.map((o) => (
              <label key={o.id} className={`onb-option-row${fleet.cloudConnection === o.id ? ' is-selected' : ''}`}>
                <input type="radio" name="fleet-connection" checked={fleet.cloudConnection === o.id} onChange={() => onFleetChange({ ...fleet, cloudConnection: o.id })} />
                <span>
                  <strong>{o.label}</strong>
                  <span className="onb-help">{o.help}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    );
  }

  const questions = service === 'GHG' ? GHG_QUESTIONS : WORKFORCE_QUESTIONS;
  return (
    <div className="onb-questions">
      {questions.map((q) => (
        <YesNoQuestion
          key={q.key}
          name={`${service}-${q.key}`}
          label={q.label}
          help={q.help}
          value={answers[q.key] ?? null}
          onChange={(v) => onAnswer(q.key, v)}
        />
      ))}
    </div>
  );
};
