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

  const royaltyPercent = ((licensorRoyaltyCents / grossAmountCents) * 100).toFixed(1);
  const charityPercent = ((charityGiftCents / grossAmountCents) * 100).toFixed(1);

  return (
    <div className="split-bar-container">
      {showDetails && (
        <div className="split-bar-labels">
          <span>
            <strong>Licensor Royalty ({royaltyPercent}%):</strong> £{(licensorRoyaltyCents / 100).toFixed(2)}
          </span>
          <span>
            <strong>Charity Contribution ({charityPercent}%):</strong> £{(charityGiftCents / 100).toFixed(2)}
          </span>
        </div>
      )}
      <div
        className="split-bar-track"
        title={`Royalty: £${(licensorRoyaltyCents / 100).toFixed(2)} (${royaltyPercent}%) | Charity: £${(charityGiftCents / 100).toFixed(2)} (${charityPercent}%)`}
      >
        <div
          className="split-bar-royalty"
          style={{ width: `${royaltyPercent}%` }}
        />
        <div
          className="split-bar-charity"
          style={{ width: `${charityPercent}%` }}
        />
      </div>
    </div>
  );
};
