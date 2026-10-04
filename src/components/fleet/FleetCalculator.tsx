import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { FLEET_FUEL_LABELS, type FleetEstimate, type FleetFuelType } from '../../api/fleet.types';
import { formatTonnes } from './fleetFormat';

/**
 * Public fuel-to-CO2 estimate. Renders nothing until an administrator has published at least
 * one emission factor, so visitors never see a calculator that cannot answer.
 */
interface Props {
  /** Leave out the built-in heading when the page around it provides one */
  compact?: boolean;
  /** Told whether the calculator can answer, so a page can hide its surrounding section */
  onAvailabilityChange?: (available: boolean) => void;
}

export const FleetCalculator: React.FC<Props> = ({ compact = false, onAvailabilityChange }) => {
  const [fuelTypes, setFuelTypes] = useState<FleetFuelType[]>([]);
  const [fuelType, setFuelType] = useState<FleetFuelType | ''>('');
  const [litres, setLitres] = useState('');
  const [result, setResult] = useState<FleetEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getFleetCalculatorFuelTypes()
      .then((res) => {
        setFuelTypes(res.fuelTypes);
        if (res.fuelTypes.length > 0) setFuelType(res.fuelTypes[0]);
        onAvailabilityChange?.(res.fuelTypes.length > 0);
      })
      .catch(() => {
        setFuelTypes([]);
        onAvailabilityChange?.(false);
      });
  }, [onAvailabilityChange]);

  if (fuelTypes.length === 0) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelType) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.estimateFleetEmissions({ fuelType, litres: litres.trim() }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fleet-calculator-section" aria-labelledby={compact ? undefined : 'fleet-calculator-title'} aria-label={compact ? 'Fleet CO2e calculator' : undefined}>
      <div className="fleet-calculator">
        {!compact && (
          <div className="fleet-calculator-intro">
            <h2 id="fleet-calculator-title">What did your fleet emit this week?</h2>
            <p>
              Enter the fuel your excavators, trucks and vans used to see the equivalent CO2. Connect your whole fleet to
              track it by machine, site and month.
            </p>
          </div>
        )}
        <form className="fleet-form fleet-calculator-form" onSubmit={submit}>
          <label>
            Fuel
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value as FleetFuelType)}>
              {fuelTypes.map((f) => (
                <option key={f} value={f}>{FLEET_FUEL_LABELS[f]}</option>
              ))}
            </select>
          </label>
          <label>
            Litres
            <input
              required
              inputMode="decimal"
              pattern="\d{1,9}(\.\d{1,3})?"
              title="A positive number with up to 3 decimal places"
              value={litres}
              onChange={(e) => setLitres(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Calculating...' : 'Calculate CO2'}
          </button>
        </form>

        {error && <p className="fleet-error-text" role="alert">{error}</p>}

        {result && (
          <div className="fleet-calculator-result" role="status">
            <span className="fleet-hero-value">
              {formatTonnes(result.kgCo2e)} <small>t CO2e (estimate)</small>
            </span>
            <span className="fleet-muted">
              Using {result.factor.kgCo2ePerUnit} kg CO2e per {result.factor.unit} from {result.factor.source}{' '}
              {result.factor.publicationYear}. An estimate for guidance, not a verified figure.
            </span>
            <Link to="/create-account" className="btn btn-secondary">
              Track your whole fleet
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
