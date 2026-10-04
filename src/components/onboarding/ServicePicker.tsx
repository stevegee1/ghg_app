import React from 'react';
import { SERVICE_OPTIONS, type ClientService } from './onboardingServices';

interface Props {
  value: ClientService | null;
  onChange: (service: ClientService) => void;
  /** Services the client already has, shown as unavailable. */
  disabled?: ClientService[];
}

export const ServicePicker: React.FC<Props> = ({ value, onChange, disabled = [] }) => (
  <fieldset className="onb-fieldset">
    <legend className="onb-legend">Which service do you need?</legend>
    <p className="onb-help">Each service has its own workflow. You can add another service later from your portal.</p>
    <div className="onb-service-grid">
      {SERVICE_OPTIONS.map((option) => {
        const isDisabled = disabled.includes(option.id);
        return (
          <label
            key={option.id}
            className={`onb-service-card${value === option.id ? ' is-selected' : ''}${isDisabled ? ' is-disabled' : ''}`}
          >
            <input
              type="radio"
              name="client-service"
              value={option.id}
              checked={value === option.id}
              disabled={isDisabled}
              onChange={() => onChange(option.id)}
            />
            <span className="onb-service-title">{option.title}</span>
            <span className="onb-service-summary">{isDisabled ? 'Already part of your account.' : option.summary}</span>
          </label>
        );
      })}
    </div>
  </fieldset>
);
