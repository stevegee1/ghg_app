import React, { useState } from 'react';
import { SCOPE3_STAGE_LABELS, type Scope3Record, type Scope3RecordInput, type Scope3Stage } from '../../api/scope3.types';

interface Props {
  /** Pre-fills the form to correct an existing record. */
  correcting?: Scope3Record | null;
  submitLabel: string;
  onSubmit: (input: Scope3RecordInput) => Promise<void>;
  onCancelCorrection?: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

/** One supply chain stage: what, how much, the emission factor and where the factor comes from. */
export const Scope3RecordForm: React.FC<Props> = ({ correcting, submitLabel, onSubmit, onCancelCorrection }) => {
  const [stage, setStage] = useState<Scope3Stage>(correcting?.stage ?? 'RAW_MATERIAL');
  const [description, setDescription] = useState(correcting?.description ?? '');
  const [supplierName, setSupplierName] = useState(correcting?.supplierName ?? '');
  const [quantity, setQuantity] = useState(correcting?.quantity ?? '');
  const [unit, setUnit] = useState(correcting?.unit ?? '');
  const [factor, setFactor] = useState(correcting?.factorKgCo2ePerUnit ?? '');
  const [factorSource, setFactorSource] = useState(correcting?.factorSource ?? '');
  const [occurredOn, setOccurredOn] = useState(correcting?.occurredOn ?? today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        stage,
        description: description.trim(),
        supplierName: supplierName.trim(),
        quantity: quantity.trim(),
        unit: unit.trim().toLowerCase(),
        factorKgCo2ePerUnit: factor.trim(),
        factorSource: factorSource.trim(),
        occurredOn,
        ...(correcting ? { supersedesId: correcting.id } : {}),
      });
      if (!correcting) {
        setDescription('');
        setQuantity('');
        setFactor('');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="fleet-panel fleet-form" onSubmit={submit}>
      <h3 className="fleet-panel-title">{correcting ? 'Correct a record' : 'Add a stage'}</h3>
      {correcting && <p className="fleet-muted">The original stays on record and is marked as replaced by this one.</p>}
      <div className="fleet-form-grid">
        <label>
          Stage
          <select value={stage} onChange={(e) => setStage(e.target.value as Scope3Stage)}>
            {(Object.keys(SCOPE3_STAGE_LABELS) as Scope3Stage[]).map((s) => (
              <option key={s} value={s}>
                {SCOPE3_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          What
          <input value={description} maxLength={300} placeholder="e.g. Cement CEM I" onChange={(e) => setDescription(e.target.value)} required />
        </label>
        <label>
          Supplier
          <input value={supplierName} maxLength={200} onChange={(e) => setSupplierName(e.target.value)} required />
        </label>
        <label>
          Quantity
          <input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </label>
        <label>
          Unit
          <input value={unit} maxLength={20} placeholder="tonne, m3, kwh, tonne_km" onChange={(e) => setUnit(e.target.value)} required />
        </label>
        <label>
          Emission factor (kg CO2e per unit)
          <input inputMode="decimal" value={factor} onChange={(e) => setFactor(e.target.value)} required />
        </label>
        <label>
          Factor source
          <input value={factorSource} maxLength={500} placeholder="e.g. Supplier EPD reference, or DESNZ 2025 table" onChange={(e) => setFactorSource(e.target.value)} required />
        </label>
        <label>
          Date
          <input type="date" value={occurredOn} max={today()} onChange={(e) => setOccurredOn(e.target.value)} required />
        </label>
      </div>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      <div className="fleet-form-actions">
        {correcting && onCancelCorrection && (
          <button type="button" className="btn btn-secondary" onClick={onCancelCorrection}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};
