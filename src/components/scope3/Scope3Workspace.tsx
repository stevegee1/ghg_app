import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import {
  SCOPE3_CATEGORY_LABELS,
  SCOPE3_STAGE_LABELS,
  type Scope3Category,
  type Scope3ChainDetail,
  type Scope3ChainSummary,
  type Scope3Record,
} from '../../api/scope3.types';
import { Scope3RecordForm } from './Scope3RecordForm';

const tonnes = (kg: string) => (Number(kg) / 1000).toLocaleString('en-GB', { maximumFractionDigits: 3 });

const ChainDetail: React.FC<{ token: string; chainId: string; onBack: () => void; onChanged: () => void }> = ({ token, chainId, onBack, onChanged }) => {
  const [chain, setChain] = useState<Scope3ChainDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<Scope3Record | null>(null);
  const [supplierEmail, setSupplierEmail] = useState('');
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setChain((await api.getScope3Chain(token, chainId)).chain);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token, chainId]);
  useEffect(() => {
    void load();
  }, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteNotice(null);
    try {
      const r = await api.inviteScope3Supplier(token, chainId, supplierEmail.trim());
      setInviteNotice(
        r.emailSent ? `Invite sent to ${r.invite.supplierEmail}.` : `Invite created for ${r.invite.supplierEmail}, but the email could not be sent. Try again later.`
      );
      setSupplierEmail('');
      void load();
    } catch (err) {
      setInviteError((err as Error).message);
    }
  };

  if (error) return <div className="fleet-panel fleet-error-text" role="alert">{error}</div>;
  if (!chain) return <div className="fleet-panel fleet-state">Loading supply chain...</div>;

  const current = chain.records.filter((r) => !r.superseded);
  const total = current.reduce((sum, r) => sum + Number(r.kgCo2e), 0);

  return (
    <div className="fleet-stack">
      <div className="fleet-panel">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          All supply chains
        </button>
        <h3 className="fleet-panel-title scope3-title">{chain.name}</h3>
        <p className="fleet-muted">
          {SCOPE3_CATEGORY_LABELS[chain.category]}
          {chain.project ? ` · project ${chain.project.name}` : ''} · {tonnes(String(total))} tCO2e across {current.length} current record(s)
        </p>
      </div>

      <div className="fleet-panel">
        <h3 className="fleet-panel-title">Stages</h3>
        {chain.records.length === 0 ? (
          <p className="fleet-muted">No stages yet. Add them below or invite the supplier to add theirs.</p>
        ) : (
          <div className="transparency-table-wrap">
            <table className="transparency-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Stage</th>
                  <th scope="col">What</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Factor</th>
                  <th scope="col">kg CO2e</th>
                  <th scope="col">Entered by</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {chain.records.map((r) => (
                  <tr key={r.id} className={r.superseded ? 'scope3-superseded' : undefined}>
                    <td>{r.occurredOn}</td>
                    <td>{SCOPE3_STAGE_LABELS[r.stage]}</td>
                    <td className="scope3-text">
                      {r.description} ({r.supplierName}){r.superseded ? ' · replaced' : ''}
                    </td>
                    <td>
                      {r.quantity} {r.unit}
                    </td>
                    <td className="scope3-text">
                      {r.factorKgCo2ePerUnit} ({r.factorSource})
                    </td>
                    <td>{r.kgCo2e}</td>
                    <td>{r.enteredBy === 'SUPPLIER' ? 'Supplier' : 'You'}</td>
                    <td>
                      {!r.superseded && (
                        <button type="button" className="btn btn-secondary" onClick={() => setCorrecting(r)}>
                          Correct
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Scope3RecordForm
        key={correcting?.id ?? 'new'}
        correcting={correcting}
        submitLabel={correcting ? 'Save correction' : 'Add stage'}
        onCancelCorrection={() => setCorrecting(null)}
        onSubmit={async (input) => {
          await api.addScope3Record(token, chainId, input);
          setCorrecting(null);
          await load();
          onChanged();
        }}
      />

      <form className="fleet-panel fleet-form" onSubmit={invite}>
        <h3 className="fleet-panel-title">Invite a supplier</h3>
        <p className="fleet-muted">The supplier gets a link to add their own stages, with their factors and sources. Links last 30 days.</p>
        <div className="fleet-project-assign">
          <label>
            Supplier work email
            <input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary">
            Send invite
          </button>
        </div>
        {inviteNotice && (
          <p className="fleet-muted" role="status">
            {inviteNotice}
          </p>
        )}
        {inviteError && (
          <p className="fleet-error-text" role="alert">
            {inviteError}
          </p>
        )}
        {chain.invites.length > 0 && (
          <ul className="fleet-project-assignments">
            {chain.invites.map((i) => (
              <li key={i.id}>
                <span>{i.supplierEmail}</span>
                <span className="fleet-muted">until {new Date(i.expiresAt).toLocaleDateString('en-GB')}</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async () => {
                    await api.revokeScope3Invite(token, chainId, i.id);
                    void load();
                  }}
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
};

/** Scope 3 supply chains: each purchased material followed from raw material to delivery. */
export const Scope3Workspace: React.FC<{ token: string }> = ({ token }) => {
  const [chains, setChains] = useState<Scope3ChainSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Scope3Category>('PURCHASED_GOODS_AND_SERVICES');
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setChains((await api.listScope3Chains(token)).chains);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      const r = await api.createScope3Chain(token, { name: name.trim(), category });
      setName('');
      await load();
      setOpenId(r.chain.id);
    } catch (err) {
      setCreateError((err as Error).message);
    }
  };

  if (openId) return <ChainDetail token={token} chainId={openId} onBack={() => setOpenId(null)} onChanged={load} />;

  return (
    <section className="fleet-stack" aria-labelledby="scope3-title">
      <header>
        <h2 id="scope3-title" className="fleet-panel-title">
          Supply chain (Scope 3)
        </h2>
        <p className="fleet-muted">
          Follow what you buy from raw material to delivery. Every record is kept unchanged, fingerprinted and anchored on a public blockchain, and
          totals feed your climate ledger.
        </p>
      </header>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!chains && !error && <div className="fleet-panel fleet-state">Loading supply chains...</div>}
      {chains && (
        <>
          <form className="fleet-panel fleet-form" onSubmit={create}>
            <h3 className="fleet-panel-title">Add a supply chain</h3>
            <div className="fleet-project-assign">
              <label>
                Name
                <input value={name} maxLength={200} placeholder="e.g. Ready-mix concrete, A14" onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                Scope 3 category
                <select value={category} onChange={(e) => setCategory(e.target.value as Scope3Category)}>
                  {(Object.keys(SCOPE3_CATEGORY_LABELS) as Scope3Category[]).map((c) => (
                    <option key={c} value={c}>
                      {SCOPE3_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn btn-primary">
                Add
              </button>
            </div>
            {createError && (
              <p className="fleet-error-text" role="alert">
                {createError}
              </p>
            )}
          </form>
          {chains.length === 0 && <div className="fleet-panel fleet-muted">No supply chains yet.</div>}
          {chains.map((c) => (
            <button key={c.id} type="button" className="fleet-panel scope3-chain-card" onClick={() => setOpenId(c.id)}>
              <strong>{c.name}</strong>
              <span className="fleet-muted">
                {SCOPE3_CATEGORY_LABELS[c.category]} · {c.recordCount} record(s) · {tonnes(c.kgCo2e)} tCO2e
              </span>
            </button>
          ))}
        </>
      )}
    </section>
  );
};
