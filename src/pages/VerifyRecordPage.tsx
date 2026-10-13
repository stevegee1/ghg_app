import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { VerifyMatch, VerifyResult } from '../api/anchor.types';

const KIND_LABELS: Record<string, string> = {
  FLEET_TELEMETRY_SNAPSHOT: 'Machine telemetry reading',
  FLEET_IMPORT_FILE: 'Fleet data file',
  FLEET_COST_RUN: 'Contract cost calculation',
  EVIDENCE_FILE: 'Evidence file',
  CREDENTIAL: 'Issued credential',
  SCOPE3_RECORD: 'Scope 3 supply chain record',
};

async function sha256OfFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const Check: React.FC<{ ok: boolean | null; yes: string; no: string; unknown: string }> = ({ ok, yes, no, unknown }) => (
  <li className={ok === true ? 'verify-ok' : ok === false ? 'verify-bad' : 'verify-unknown'}>{ok === true ? yes : ok === false ? no : unknown}</li>
);

const MatchCard: React.FC<{ m: VerifyMatch }> = ({ m }) => (
  <article className="transparency-card verify-card">
    <h3>{KIND_LABELS[m.kind] ?? m.kind}</h3>
    <p className="transparency-note">Recorded {new Date(m.fingerprintedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
    <ul className="verify-checks">
      <Check ok={m.formulaHolds} yes="This file or record is exactly the one we recorded." no="This does not match what we recorded." unknown="" />
      <Check
        ok={m.proofValid}
        yes="It is included in that day's sealed batch."
        no="It could not be matched to its daily batch."
        unknown="It will be added to tonight's daily batch."
      />
      {m.batch && (
        <Check
          ok={m.chain.status === 'NOT_PUBLISHED' ? null : m.chain.rootOnChainMatches}
          yes={`The batch is published on the public ${m.batch.network ?? 'blockchain'} record and matches.`}
          no="The published record does not match this batch."
          unknown={m.chain.status === 'NOT_PUBLISHED' ? 'The batch has not been published yet.' : 'Published; the public record cannot be read right now.'}
        />
      )}
    </ul>
    {m.chain.explorerUrl && (
      <p>
        <a href={m.chain.explorerUrl} target="_blank" rel="noopener noreferrer">
          View the transaction{m.batch?.blockNumber ? ` (block ${m.batch.blockNumber})` : ''}
        </a>
      </p>
    )}
    <details className="verify-details">
      <summary>Technical details (for developers and auditors)</summary>
      <dl>
        <dt>Record SHA-256</dt>
        <dd>{m.recordSha256}</dd>
        <dt>Fingerprint</dt>
        <dd>{m.leafHash}</dd>
        {m.batch && (
          <>
            <dt>Batch root</dt>
            <dd>{m.batch.merkleRoot}</dd>
          </>
        )}
        {m.proof && m.proof.length > 0 && (
          <>
            <dt>Proof ({m.proof.length} hashes)</dt>
            <dd>{m.proof.join(' ')}</dd>
          </>
        )}
      </dl>
    </details>
  </article>
);

/** Public page: check that a record or file was fingerprinted and anchored on chain. */
export const VerifyRecordPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('hash') ?? '');
  const [state, setState] = useState<{ status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | { status: 'done'; result: VerifyResult }>({
    status: 'idle',
  });

  const lookup = async (hash: string) => {
    const clean = hash.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(clean)) return setState({ status: 'error', message: 'Enter the 64-character fingerprint code, or choose the file instead.' });
    setState({ status: 'loading' });
    setParams({ hash: clean }, { replace: true });
    try {
      setState({ status: 'done', result: await api.verifyRecordHash(clean) });
    } catch (err) {
      setState({ status: 'error', message: (err as Error).message });
    }
  };

  useEffect(() => {
    document.title = 'Verify a record - NFTYLOGS';
    const initial = params.get('hash');
    if (initial) void lookup(initial);
    // Only on first load: later lookups are triggered by the form.
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const hash = await sha256OfFile(file);
    setInput(hash);
    void lookup(hash);
  };

  return (
    <main className="transparency-page container-x">
      <header className="transparency-hero">
        <p className="partners-eyebrow">Verification</p>
        <h1>Verify a record</h1>
        <p>
          Check that a document or record from NFTYLOGS has not been changed since we recorded it. Choose the file, or paste the code printed on
          the document. Your file stays on your device: it is never uploaded.
        </p>
      </header>

      <section className="transparency-section" aria-labelledby="verify-what-title">
        <h2 id="verify-what-title">What we check</h2>
        <ol className="partners-points">
          <li>
            <strong>Is it unchanged?</strong> Every file and record gets a unique code (a SHA-256 fingerprint) when we receive it. Changing even
            one character produces a different code.
          </li>
          <li>
            <strong>Was it sealed?</strong> Each night, the day&apos;s codes are combined into one sealed batch.
          </li>
          <li>
            <strong>Is the seal public?</strong> The batch is published on a public blockchain, where nobody, including us, can alter it later.
          </li>
        </ol>
      </section>

      <form
        className="verify-form"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(input);
        }}
      >
        <label className="verify-field">
          <span>Fingerprint code (SHA-256)</span>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="64 letters and numbers" spellCheck={false} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={state.status === 'loading'}>
          {state.status === 'loading' ? 'Checking...' : 'Check'}
        </button>
        <label className="btn btn-secondary verify-file">
          Choose a file
          <input type="file" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </form>

      <section className="transparency-section" aria-live="polite">
        {state.status === 'error' && (
          <p className="transparency-note" role="alert">
            {state.message}
          </p>
        )}
        {state.status === 'done' && state.result.matches.length === 0 && (
          <p className="transparency-note">
            We have no record of this file or code. If it was issued today, check again tomorrow: new records are sealed once a day. If the file was
            edited after we issued it, it will not match.
          </p>
        )}
        {state.status === 'done' && state.result.matches.length > 0 && (
          <div className="transparency-cards">
            {state.result.matches.map((m) => (
              <MatchCard key={`${m.kind}-${m.recordId}`} m={m} />
            ))}
          </div>
        )}
        {state.status === 'done' && (
          <details className="verify-details">
            <summary>Technical method (for developers and auditors)</summary>
            <ul>
              {state.result.method.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {state.result.anchoringWallet && <li>anchoring wallet: {state.result.anchoringWallet}</li>}
            </ul>
          </details>
        )}
      </section>
    </main>
  );
};
