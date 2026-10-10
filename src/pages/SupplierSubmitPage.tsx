import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { SCOPE3_CATEGORY_LABELS, SCOPE3_STAGE_LABELS, type Scope3Category, type Scope3Record } from '../api/scope3.types';
import { Scope3RecordForm } from '../components/scope3/Scope3RecordForm';

type Invite = { clientName: string; chainName: string; category: string; supplierEmail: string; expiresAt: string };

/** Public page a supplier reaches from an invite link to add their supply chain stages. */
export const SupplierSubmitPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(token ? null : 'This link is incomplete.');
  const [added, setAdded] = useState<Scope3Record[]>([]);

  useEffect(() => {
    document.title = 'Supply chain emissions - NFTYLOGS';
    if (!token) return;
    api
      .getSupplierInvite(token)
      .then(setInvite)
      .catch((err: Error) => setError(err.message));
  }, [token]);

  return (
    <main className="transparency-page container-x">
      <header className="transparency-hero">
        <p className="partners-eyebrow">Supply chain emissions</p>
        <h1>{invite ? invite.chainName : 'Add your supply chain stages'}</h1>
        {invite && (
          <p>
            {invite.clientName} asks you to record your stages of this supply chain, reported as{' '}
            {SCOPE3_CATEGORY_LABELS[invite.category as Scope3Category] ?? invite.category}. Give the quantity, the emission factor you use and where that factor comes from. Records cannot be edited once added.
          </p>
        )}
      </header>
      {error && (
        <p className="transparency-note" role="alert">
          {error}
        </p>
      )}
      {!invite && !error && <p className="transparency-note">Checking your link...</p>}
      {invite && (
        <div className="fleet-stack">
          <Scope3RecordForm
            submitLabel="Add stage"
            onSubmit={async (input) => {
              const { supersedesId: _ignored, ...fields } = input;
              const r = await api.addSupplierRecord(token, fields);
              setAdded((prev) => [...prev, r.record]);
            }}
          />
          {added.length > 0 && (
            <div className="fleet-panel">
              <h3 className="fleet-panel-title">Added in this session</h3>
              <ul className="fleet-project-assignments">
                {added.map((r) => (
                  <li key={r.id}>
                    <span>
                      <strong>{SCOPE3_STAGE_LABELS[r.stage]}</strong> {r.description}
                    </span>
                    <span className="fleet-muted">{r.kgCo2e} kg CO2e</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="transparency-note">This link works until {new Date(invite.expiresAt).toLocaleDateString('en-GB')}.</p>
        </div>
      )}
    </main>
  );
};
