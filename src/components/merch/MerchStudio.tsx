import React, { useState } from 'react';
import { api } from '../../api/client';
import type { MerchProduct } from '../../api/merch.types';
import { formatPence } from './useMerchProducts';
import { MAJOR_SPORTS, PLACEMENT_OPTIONS, THREAD_COLORS } from './studioOptions';
import { MerchPartnerLinks } from './MerchPartnerLinks';

interface Props {
  garments: MerchProduct[];
  charityShare: string | null;
}

const QUOTE_MAX = 80;
const CUSTOM = '__custom__';

/** Custom embroidered commemorations: configure the moment and garment, then pay through Stripe. */
export const MerchStudio: React.FC<Props> = ({ garments, charityShare }) => {
  const [sportId, setSportId] = useState(MAJOR_SPORTS[0].id);
  const sport = MAJOR_SPORTS.find((s) => s.id === sportId) ?? MAJOR_SPORTS[0];
  const [club, setClub] = useState(sport.defaultTeam);
  const [customClub, setCustomClub] = useState<string | null>(null);
  const [opponent, setOpponent] = useState(sport.defaultOpponent);
  const [minute, setMinute] = useState(sport.defaultMinute);
  const [moment, setMoment] = useState('');
  const [quote, setQuote] = useState(sport.defaultQuote);
  const [garmentId, setGarmentId] = useState(garments[0].id);
  const [threadColor, setThreadColor] = useState(THREAD_COLORS[0].id);
  const [placement, setPlacement] = useState(PLACEMENT_OPTIONS[0].id);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const garment = garments.find((g) => g.id === garmentId) ?? garments[0];
  const thread = THREAD_COLORS.find((t) => t.id === threadColor) ?? THREAD_COLORS[0];
  const placementLabel = PLACEMENT_OPTIONS.find((p) => p.id === placement)?.label ?? placement;
  const clubName = (customClub ?? club).trim();
  const total = (garment.pricePence as number) * quantity;

  const changeSport = (id: string) => {
    const next = MAJOR_SPORTS.find((s) => s.id === id) ?? MAJOR_SPORTS[0];
    setSportId(next.id);
    setClub(next.defaultTeam);
    setCustomClub(null);
    setOpponent(next.defaultOpponent);
    setMinute(next.defaultMinute);
    setMoment('');
    setQuote(next.defaultQuote);
  };

  const pay = async () => {
    if (!clubName) return setError(`Choose or enter your ${sport.teamLabel.toLowerCase()}.`);
    const inscription = quote.trim() || `${clubName} ${moment} (${minute})`.trim();
    if (inscription.length > QUOTE_MAX) return setError(`The inscription must be ${QUOTE_MAX} characters or fewer.`);
    setLoading(true);
    setError(null);
    try {
      const res = await api.checkoutCustomKeepsake({
        garmentModel: garment.id,
        inscribedText: inscription,
        threadColor,
        placement,
        quantity,
        checkoutReferenceId: `frenzy_${crypto.randomUUID()}`,
        isGoalFrenzy: true,
        frenzyClub: clubName,
        frenzyOpponent: opponent || undefined,
        frenzyMinute: minute || undefined,
        frenzyMoment: moment || undefined,
        frenzyQuote: inscription,
      });
      if (!res?.sessionUrl) throw new Error('Checkout is unavailable right now. Please try again later.');
      window.location.href = res.sessionUrl;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="merch-layout">
      <div className="merch-studio-steps">
        <section className="merch-panel" aria-labelledby="studio-moment">
          <h2 id="studio-moment" className="merch-panel-title">1. The moment</h2>
          <p className="merch-note">Choose the sport, the team and the moment you want embroidered.</p>
          <div className="merch-fields">
            <label className="merch-field">
              <span>Sport</span>
              <select className="form-input" value={sportId} onChange={(e) => changeSport(e.target.value)}>
                {MAJOR_SPORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="merch-field">
              <span>{sport.teamLabel}</span>
              <select
                className="form-input"
                value={customClub !== null ? CUSTOM : club}
                onChange={(e) => {
                  if (e.target.value === CUSTOM) setCustomClub('');
                  else {
                    setClub(e.target.value);
                    setCustomClub(null);
                  }
                }}
              >
                {sport.presetClubs.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={CUSTOM}>Other {sport.teamLabel.toLowerCase()}</option>
              </select>
            </label>
            {customClub !== null && (
              <label className="merch-field merch-field-wide">
                <span>{sport.teamLabel} name</span>
                <input className="form-input" value={customClub} onChange={(e) => setCustomClub(e.target.value)} />
              </label>
            )}
            <label className="merch-field">
              <span>{sport.opponentLabel}</span>
              <input className="form-input" value={opponent} placeholder={sport.opponentPlaceholder} onChange={(e) => setOpponent(e.target.value)} />
            </label>
            <label className="merch-field">
              <span>{sport.minuteLabel}</span>
              <input className="form-input" value={minute} placeholder={sport.minutePlaceholder} onChange={(e) => setMinute(e.target.value)} />
            </label>
            <label className="merch-field merch-field-wide">
              <span>The moment</span>
              <input className="form-input" value={moment} placeholder={sport.momentPlaceholder} onChange={(e) => setMoment(e.target.value)} />
            </label>
            <label className="merch-field merch-field-wide">
              <span className="merch-field-row">
                Embroidered inscription
                <span className={quote.length > QUOTE_MAX ? 'merch-error' : 'merch-note'}>
                  {quote.length}/{QUOTE_MAX}
                </span>
              </span>
              <input className="form-input" value={quote} maxLength={QUOTE_MAX} onChange={(e) => setQuote(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="merch-panel" aria-labelledby="studio-garment">
          <h2 id="studio-garment" className="merch-panel-title">2. The garment</h2>
          <p className="merch-note">Choose the garment, thread colour and where the embroidery goes.</p>
          <div className="merch-fields">
            <label className="merch-field merch-field-wide">
              <span>Garment</span>
              <select className="form-input" value={garment.id} onChange={(e) => setGarmentId(e.target.value)}>
                {garments.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}, {formatPence(g.pricePence as number, g.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label className="merch-field">
              <span>Thread colour</span>
              <select className="form-input" value={threadColor} onChange={(e) => setThreadColor(e.target.value)}>
                {THREAD_COLORS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="merch-field">
              <span>Placement</span>
              <select className="form-input" value={placement} onChange={(e) => setPlacement(e.target.value)}>
                {PLACEMENT_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </div>

      <aside className="merch-order" aria-labelledby="studio-order-title">
        <h2 id="studio-order-title" className="merch-order-title">Your Frenzy Studio order</h2>
        <dl className="merch-summary">
          <div>
            <dt>Team</dt>
            <dd>{clubName || 'Not chosen'}</dd>
          </div>
          <div>
            <dt>Garment</dt>
            <dd>{garment.title}</dd>
          </div>
          <div>
            <dt>Thread</dt>
            <dd className="merch-swatch-row">
              <span className="merch-swatch" style={{ background: thread.hex }} aria-hidden="true" />
              {thread.label}
            </dd>
          </div>
          <div>
            <dt>Placement</dt>
            <dd>{placementLabel}</dd>
          </div>
        </dl>
        <div className="merch-order-section">
          <div className="merch-qty">
            <span id="studio-qty-label">Quantity</span>
            <div className="merch-qty-control" role="group" aria-labelledby="studio-qty-label">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="One fewer">
                -
              </button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setQuantity((q) => q + 1)} aria-label="One more">
                +
              </button>
            </div>
          </div>
          <div className="merch-total">
            <span>Total</span>
            <strong>{formatPence(total, garment.currency)}</strong>
          </div>
          {error && (
            <p className="merch-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary merch-block-btn" onClick={pay} disabled={loading}>
            {loading ? 'Opening Stripe...' : `Pay ${formatPence(total, garment.currency)}`}
          </button>
          <p className="merch-note">Secure payment by Stripe. Delivery details are taken at checkout.</p>
          <p className="merch-note">
            {charityShare ? `${charityShare}% of this order goes to our charity partners.` : 'A share of this order goes to our charity partners.'}
          </p>
        </div>
        <MerchPartnerLinks />
      </aside>
    </div>
  );
};
