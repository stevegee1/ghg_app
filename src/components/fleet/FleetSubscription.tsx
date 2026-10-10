import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { FleetOverview } from '../../api/fleet.types';
import { formatDate } from './fleetFormat';

interface Props {
  token: string;
  overview: FleetOverview;
  /** Opens the Assets tab, where the first asset is registered. */
  onAddAssets: () => void;
}

const STATUS_COPY: Record<string, { label: string; detail: string }> = {
  ACTIVE: { label: 'Active', detail: 'Uploads, dashboard and reports are available.' },
  PAST_DUE: { label: 'Payment overdue', detail: 'Stripe is retrying your payment. Update your card to avoid interruption.' },
  UNPAID: { label: 'Suspended', detail: 'Payment failed. Your data is kept; update your payment details to restore access.' },
  CANCELED: { label: 'Cancelled', detail: 'Your data is kept. Subscribe again to restore access.' },
  INCOMPLETE: { label: 'Not started', detail: 'Checkout was not completed.' },
};

export const FleetSubscription: React.FC<Props> = ({ token, overview, onAddAssets }) => {
  const [pricing, setPricing] = useState<{ unitAmount: number; currency: string; interval: string } | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getFleetPricing()
      .then(setPricing)
      .catch((err: Error) => setPricingError(err.message));
  }, []);

  const subscription = overview.subscription;
  const canManage = Boolean(subscription && subscription.status !== 'INCOMPLETE');
  const canSubscribe = !subscription || ['INCOMPLETE', 'CANCELED'].includes(subscription.status);
  const money = (pence: number, currency: string) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(pence / 100);

  const go = async (action: 'subscribe' | 'manage') => {
    setBusy(true);
    setError(null);
    try {
      const url = action === 'subscribe' ? (await api.startFleetSubscription(token)).checkoutUrl : (await api.openFleetBillingPortal(token)).url;
      window.location.assign(url);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="fleet-stack">
      <div className="fleet-panel">
        <h3 className="fleet-panel-title">Fleet subscription</h3>
        {pricingError && <p className="fleet-error-text">Pricing is unavailable right now. {pricingError}</p>}
        {!pricing && !pricingError && <p className="fleet-state">Loading pricing...</p>}
        {pricing && (
          <p className="fleet-price">
            <strong>{money(pricing.unitAmount, pricing.currency)}</strong> per active asset per {pricing.interval}
            {overview.activeAssets > 0 && (
              <span className="fleet-muted">
                {' '}· {overview.activeAssets} active {overview.activeAssets === 1 ? 'asset' : 'assets'} ≈{' '}
                {money(pricing.unitAmount * overview.activeAssets, pricing.currency)} per {pricing.interval}, plus any tax shown at checkout
              </span>
            )}
          </p>
        )}

        {subscription && STATUS_COPY[subscription.status] && (
          <div className="fleet-status">
            <span className={`fleet-status-badge status-${subscription.status.toLowerCase()}`}>{STATUS_COPY[subscription.status].label}</span>
            <span>{STATUS_COPY[subscription.status].detail}</span>
            {subscription.currentPeriodEnd && subscription.status === 'ACTIVE' && (
              <span className="fleet-muted">Renews {formatDate(subscription.currentPeriodEnd)} for {subscription.quantity} assets.</span>
            )}
          </div>
        )}

        {canSubscribe && overview.activeAssets === 0 && (
          <p className="fleet-muted">You are billed per active asset, so add your first machine or vehicle before subscribing.</p>
        )}

        {error && <p className="fleet-error-text" role="alert">{error}</p>}

        <div className="fleet-form-actions">
          {canSubscribe && overview.activeAssets === 0 && (
            <button type="button" className="btn btn-primary" onClick={onAddAssets}>
              Add your first asset
            </button>
          )}
          {canSubscribe && overview.activeAssets > 0 && (
            <button type="button" className="btn btn-primary" disabled={busy || !pricing} onClick={() => go('subscribe')}>
              {busy ? 'Opening checkout...' : 'Subscribe'}
            </button>
          )}
          {canManage && (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => go('manage')}>
              {busy ? 'Opening...' : 'Manage billing'}
            </button>
          )}
        </div>
      </div>

      <div className="fleet-panel">
        <h3 className="fleet-panel-title">How billing works</h3>
        <ul className="fleet-plain-list">
          <li>You pay for each active asset each month. Deactivating an asset reduces your next bill.</li>
          <li>If you cancel or a payment fails, your data is kept and access returns when you resubscribe.</li>
          <li>A share of every payment goes to the charities in our published split, recorded in the transparency ledger.</li>
        </ul>
      </div>
    </div>
  );
};
