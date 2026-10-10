import React from 'react';
import { SERVICE_OPTIONS, type ClientService } from './onboardingServices';

interface Props {
  value: ClientService[];
  onChange: (services: ClientService[]) => void;
  /** Services the client already has, shown as unavailable. */
  disabled?: ClientService[];
}

export const ServicePicker: React.FC<Props> = ({ value, onChange, disabled = [] }) => {
  const toggle = (service: ClientService) =>
    onChange(value.includes(service) ? value.filter((s) => s !== service) : [...value, service]);

  return (
    <fieldset className="onb-fieldset">
      <legend className="onb-legend">Which services do you need?</legend>
      <p className="onb-help">Choose one or more. Each service has its own workflow, and you can add others later from your portal.</p>
      <div className="onb-service-grid">
        {SERVICE_OPTIONS.map((option) => {
          const isDisabled = disabled.includes(option.id);
          const isSelected = value.includes(option.id);
          return (
            <label
              key={option.id}
              className={`onb-service-card${isSelected ? ' is-selected' : ''}${isDisabled ? ' is-disabled' : ''}`}
            >
              <input
                type="checkbox"
                name="client-service"
                value={option.id}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggle(option.id)}
              />
              <span className="onb-service-title">{option.title}</span>
              <span className="onb-service-summary">{isDisabled ? 'Already part of your account.' : option.summary}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
