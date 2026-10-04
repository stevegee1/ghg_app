import React from 'react';

const STEPS = [
  { title: 'Tell us about your organisation', body: 'A short onboarding takes you to the right service and the standards that apply to you.' },
  { title: 'Connect your data and evidence', body: 'Upload documents and fuel records, connect your machines, or send data through our API.' },
  { title: 'Get reviewed results', body: 'Emissions calculated from real consumption, reviewed evidence, reports to download and credentials to share.' },
];

export const HowItWorks: React.FC = () => (
  <section className="landing-section landing-section-alt" aria-labelledby="how-title">
    <div className="container-x">
      <header className="landing-section-head">
        <p className="landing-eyebrow">How it works</p>
        <h2 id="how-title">From raw data to results you can stand behind</h2>
      </header>
      <ol className="landing-steps">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <span className="landing-step-number" aria-hidden="true">
              {i + 1}
            </span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
