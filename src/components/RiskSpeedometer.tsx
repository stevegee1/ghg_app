import React from 'react';

interface RiskSpeedometerProps {
  score: number; // 0.0 to 5.0
  riskLevel: 'LOW_RISK_CONFORMANT' | 'MEDIUM_RISK_OFI' | 'HIGH_RISK_GREENWASHING_EXPOSURE';
}

export const RiskSpeedometer: React.FC<RiskSpeedometerProps> = ({ score, riskLevel }) => {
  const percentage = Math.min(Math.max((score / 5.0) * 100, 0), 100);

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'LOW_RISK_CONFORMANT':
        return '#137333'; // Google Green
      case 'MEDIUM_RISK_OFI':
        return '#b06000'; // Google Amber
      case 'HIGH_RISK_GREENWASHING_EXPOSURE':
        return '#c5221f'; // Google Red
    }
  };

  const getRiskBg = () => {
    switch (riskLevel) {
      case 'LOW_RISK_CONFORMANT':
        return '#e6f4ea';
      case 'MEDIUM_RISK_OFI':
        return '#fef7e0';
      case 'HIGH_RISK_GREENWASHING_EXPOSURE':
        return '#fce8e6';
    }
  };

  const getRiskLabel = () => {
    switch (riskLevel) {
      case 'LOW_RISK_CONFORMANT':
        return 'LOW RISK — CONFORMANT (ISO 14065 VERIFIED)';
      case 'MEDIUM_RISK_OFI':
        return 'MEDIUM RISK — OPPORTUNITY FOR IMPROVEMENT';
      case 'HIGH_RISK_GREENWASHING_EXPOSURE':
        return 'HIGH RISK — GREENWASHING EXPOSURE DETECTED';
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #dadce0',
        borderRadius: '8px',
        padding: '1.75rem',
        textAlign: 'center',
        boxShadow: '0 1px 2px 0 rgba(60,64,67,0.08)',
      }}
    >
      <div style={{ fontSize: '0.75rem', color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        Weighted Audit Assurance Score
      </div>

      <div style={{ fontSize: '2.75rem', fontWeight: 700, color: getRiskColor(), margin: '0.35rem 0', fontFamily: 'monospace' }}>
        {score.toFixed(2)} <span style={{ fontSize: '1.125rem', color: '#5f6368', fontWeight: 400 }}>/ 5.00</span>
      </div>

      {/* Clean Linear Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e8eaed',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: getRiskColor(),
            transition: 'width 0.4s ease-in-out',
          }}
        />
      </div>

      <div
        style={{
          display: 'inline-block',
          padding: '0.35rem 0.85rem',
          borderRadius: '16px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: getRiskBg(),
          color: getRiskColor(),
          border: `1px solid ${getRiskColor()}33`,
        }}
      >
        {getRiskLabel()}
      </div>
    </div>
  );
};
