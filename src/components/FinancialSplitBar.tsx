import React from 'react';

interface FinancialSplitBarProps {
  grossAmountCents: number;
  licensorRoyaltyCents: number;
  charityGiftCents: number;
  showDetails?: boolean;
}

export const FinancialSplitBar: React.FC<FinancialSplitBarProps> = ({
  grossAmountCents,
  licensorRoyaltyCents,
  charityGiftCents,
  showDetails = true,
}) => {
  if (!grossAmountCents || grossAmountCents <= 0) return null;

  const royaltyPercent = Number(((licensorRoyaltyCents / grossAmountCents) * 100).toFixed(1));
  const charityPercent = Number(((charityGiftCents / grossAmountCents) * 100).toFixed(1));

  return (
    <div style={{ width: '100%' }}>
      {showDetails && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8125rem',
            marginBottom: '0.5rem',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#1a73e8',
                display: 'inline-block',
              }}
            />
            <span style={{ color: 'var(--text-muted, #475569)', fontWeight: 500 }}>
              Licensor Royalty ({royaltyPercent}%):
            </span>
            <strong style={{ color: 'var(--text-main, #0f172a)', fontWeight: 700 }}>
              £{(licensorRoyaltyCents / 100).toFixed(2)}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#059669',
                display: 'inline-block',
              }}
            />
            <span style={{ color: 'var(--text-muted, #475569)', fontWeight: 500 }}>
              Statutory Charity Pool ({charityPercent}%):
            </span>
            <strong style={{ color: '#059669', fontWeight: 700 }}>
              £{(charityGiftCents / 100).toFixed(2)}
            </strong>
          </div>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: '10px',
          backgroundColor: '#e2e8f0',
          borderRadius: '9999px',
          overflow: 'hidden',
          display: 'flex',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
        }}
        title={`Licensor Royalty: £${(licensorRoyaltyCents / 100).toFixed(2)} (${royaltyPercent}%) | Charity: £${(charityGiftCents / 100).toFixed(2)} (${charityPercent}%)`}
      >
        <div
          style={{
            width: `${royaltyPercent}%`,
            height: '100%',
            backgroundColor: '#1a73e8',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        <div
          style={{
            width: `${charityPercent}%`,
            height: '100%',
            backgroundColor: '#059669',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
};
