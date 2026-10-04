import React from 'react';

interface Props {
  name: string;
  label: string;
  help: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}

/** A required yes or no question. Nothing is preselected, so every answer is deliberate. */
export const YesNoQuestion: React.FC<Props> = ({ name, label, help, value, onChange }) => (
  <fieldset className="onb-question">
    <legend className="onb-question-label">{label}</legend>
    <p className="onb-help">{help}</p>
    <div className="onb-yesno">
      {[
        { v: true, text: 'Yes' },
        { v: false, text: 'No' },
      ].map(({ v, text }) => (
        <label key={text} className={`onb-yesno-option${value === v ? ' is-selected' : ''}`}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
          <span>{text}</span>
        </label>
      ))}
    </div>
  </fieldset>
);
