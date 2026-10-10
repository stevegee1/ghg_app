import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { MarketIndex, MarketIndexCategory, MarketIndexValue } from '../../api/market.types';

const CATEGORY_LABELS: Record<MarketIndexCategory, string> = {
  FUEL: 'Fuel',
  CARBON: 'Carbon',
  MATERIAL: 'Materials',
};

const today = () => new Date().toISOString().slice(0, 10);

/** GBP_PER_TONNE_CO2E -> "GBP per tonne CO2e" */
const formatUnit = (unit: string) => {
  const [money, per] = unit.split('_PER_');
  if (!per) return unit.replace(/_/g, ' ');
  return `${money} per ${per.toLowerCase().replace(/_/g, ' ').replace('co2e', 'CO2e').replace(/\bm3\b/, 'm³')}`;
};

/** One input: its recent values, and a form to add a dated, sourced value when it is entered by hand. */
const IndexDetail: React.FC<{ token: string; index: MarketIndex; onChanged: () => void }> = ({ token, index, onChanged }) => {
  const [values, setValues] = useState<MarketIndexValue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [value, setValue] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .getMarketIndexValues(token, index.id)
      .then((r) => setValues(r.values))
      .catch((e: Error) => setError(e.message));
  }, [token, index.id]);
  useEffect(load, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.addMarketIndexValue(token, index.id, { effectiveDate: date, value: value.trim(), sourceReference: source.trim() });
      setValue('');
      setSource('');
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (valueId: string) => {
    setError(null);
    try {
      await api.deleteMarketIndexValue(token, index.id, valueId);
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="market-detail">
      <p className="fleet-muted">
        {index.source}
        {index.sourceUrl && (
          <>
            {' '}
            <a href={index.sourceUrl} target="_blank" rel="noopener noreferrer">
              Source
            </a>
          </>
        )}
      </p>
      {index.feed === 'MANUAL' && (
        <form className="market-form" onSubmit={add}>
          <label>
            <span>Effective date</span>
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            <span>Value ({formatUnit(index.unit)})</span>
            <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required />
          </label>
          <label>
            <span>Source reference</span>
            <input value={source} placeholder="Where this value comes from, e.g. publication and date" onChange={(e) => setSource(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving...' : 'Add value'}
          </button>
        </form>
      )}
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!values && !error && <p className="fleet-state">Loading values...</p>}
      {values && values.length === 0 && <p className="fleet-muted">No values yet.</p>}
      {values && values.length > 0 && (
        <div className="transparency-table-wrap">
          <table className="transparency-table">
            <thead>
              <tr>
                <th scope="col">Effective</th>
                <th scope="col">Value</th>
                <th scope="col">Source</th>
                {index.feed === 'MANUAL' && <th scope="col">Action</th>}
              </tr>
            </thead>
            <tbody>
              {values.map((v) => (
                <tr key={v.id}>
                  <td>{v.effectiveDate}</td>
                  <td>{v.value}</td>
                  <td className="market-source-cell">{v.sourceReference}</td>
                  {index.feed === 'MANUAL' && (
                    <td>
                      <button type="button" className="btn btn-secondary" onClick={() => remove(v.id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/** Market inputs used to cost contract activity. Fuel imports from the official UK weekly prices; the rest are entered with a source. */
export const MarketIndicesAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<{ indices: MarketIndex[]; fuelFeedConfigured: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .getMarketIndices(token)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [token]);
  useEffect(load, [load]);

  const runImport = async () => {
    setImporting(true);
    setNotice(null);
    setError(null);
    try {
      const r = await api.importFuelPrices(token);
      setNotice(`Fuel prices imported: ${r.inserted} new value(s), latest week ${r.latestDate ?? 'none'}.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="fleet-stack" aria-labelledby="market-inputs-title">
      <header className="fleet-admin-head">
        <div>
          <h2 id="market-inputs-title" className="fleet-panel-title">Market inputs</h2>
          <p className="fleet-muted">
            Prices used to cost contract activity. Every calculation records the values it used.
            {data && !data.fuelFeedConfigured && ' The automatic fuel price import is off (UK_FUEL_PRICE_FEED_URL is not set).'}
          </p>
        </div>
        {data?.fuelFeedConfigured && (
          <button type="button" className="btn btn-secondary" onClick={runImport} disabled={importing}>
            {importing ? 'Importing...' : 'Import fuel prices now'}
          </button>
        )}
      </header>
      {notice && (
        <p className="fleet-muted" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <div className="fleet-panel fleet-state">Loading market inputs...</div>}
      {data &&
        (Object.keys(CATEGORY_LABELS) as MarketIndexCategory[]).map((category) => {
          const group = data.indices.filter((i) => i.category === category);
          if (group.length === 0) return null;
          return (
            <div key={category} className="fleet-panel">
              <h3 className="fleet-panel-title">{CATEGORY_LABELS[category]}</h3>
              <ul className="merch-admin-list">
                {group.map((i) => (
                  <li key={i.id} className="market-row">
                    <button
                      type="button"
                      className="market-row-head"
                      aria-expanded={openId === i.id}
                      onClick={() => setOpenId(openId === i.id ? null : i.id)}
                    >
                      <span className="merch-admin-info">
                        <strong>{i.name}</strong>
                        <span className="fleet-muted">
                          {i.feed === 'MANUAL' ? 'Entered by admins' : 'Imported weekly'} · {formatUnit(i.unit)}
                        </span>
                      </span>
                      <span className="market-latest">
                        {i.latest ? `${i.latest.value} from ${i.latest.effectiveDate}` : 'No value yet'}
                      </span>
                    </button>
                    {openId === i.id && <IndexDetail token={token} index={i} onChanged={load} />}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
    </section>
  );
};
