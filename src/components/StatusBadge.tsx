import React from 'react';

interface StatusBadgeProps {
  status: 'SETTLED' | 'PENDING' | 'REFUNDED' | 'REVERSED' | 'FAILED' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status ? status.toUpperCase() : 'PENDING';

  let badgeClass = 'badge-pending';
  if (normalized === 'SETTLED') badgeClass = 'badge-settled';
  if (normalized === 'FAILED' || normalized === 'REFUNDED') badgeClass = 'badge-failed';
  if (normalized === 'REVERSED') badgeClass = 'badge-reversed';

  return <span className={`badge ${badgeClass}`}>{normalized}</span>;
};
