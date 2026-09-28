import React from 'react';

interface FinancialSplitBarProps {
  grossAmountCents: number;
  licensorRoyaltyCents: number;
  charityGiftCents: number;
  showDetails?: boolean;
  dark?: boolean;
}

export const FinancialSplitBar: React.FC<FinancialSplitBarProps> = ({
  grossAmountCents,
  licensorRoyaltyCents,
  charityGiftCents,
  showDetails = true,
  dark = false,
}) => {
  if (!grossAmountCents || grossAmountCents <= 0) return null;

  const royaltyPercent = Number(((licensorRoyaltyCents / grossAmountCents) * 100).toFixed(1));
  const charityPercent = Number(((charityGiftCents / grossAmountCents) * 100).toFixed(1));

  const royaltyColor = dark ? 'rgba(255, 255, 255, 0.7)' : '#1a73e8';
  const charityColor = dark ? '#ff2d8d' : '#059669';
  const trackBg = dark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';
  const mutedText = dark ? '#94a3b8' : 'var(--text-muted, #475569)';
  const mainText = dark ? '#ffffff' : 'var(--text-main, #0f172a)';

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
                backgroundColor: royaltyColor,
                display: 'inline-block',
              }}
            />
            <span style={{ color: mutedText, fontWeight: 500 }}>
              Licensor Royalty ({royaltyPercent}%):
            </span>
            <strong style={{ color: mainText, fontWeight: 700 }}>
              £{(licensorRoyaltyCents / 100).toFixed(2)}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: charityColor,
                display: 'inline-block',
              }}
            />
            <span style={{ color: mutedText, fontWeight: 500 }}>
              Statutory Charity Pool ({charityPercent}%):
            </span>
            <strong style={{ color: charityColor, fontWeight: 700 }}>
              £{(charityGiftCents / 100).toFixed(2)}
            </strong>
          </div>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: '10px',
          backgroundColor: trackBg,
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
            backgroundColor: royaltyColor,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        <div
          style={{
            width: `${charityPercent}%`,
            height: '100%',
            backgroundColor: charityColor,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
};
