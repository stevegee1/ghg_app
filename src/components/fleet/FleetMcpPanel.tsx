import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

interface LogEntry {
  id: string;
  method: string;
  tool: string | null;
  ok: boolean;
  error: string | null;
  createdAt: string;
}

/** How to connect an AI assistant over MCP, and the organisation's recent MCP requests. */
export const FleetMcpPanel: React.FC<{ token: string }> = ({ token }) => {
  const [entries, setEntries] = useState<LogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `${window.location.origin}/api/mcp`;

  useEffect(() => {
    api
      .getMcpLog(token)
      .then((r) => setEntries(r.entries))
      .catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <div className="fleet-panel">
      <h3 className="fleet-panel-title">Assistant connections (MCP)</h3>
      <p className="fleet-muted">
        Connect an assistant that supports the Model Context Protocol to read your machines, activity, weather exposure, machine value and ownership
        cost, contract costs and climate ledger. Access is read-only. Create a key above with the <code>fleet:read</code> scope and use it as the bearer
        token.
      </p>
      <pre className="fleet-api-example">
        <code>{`MCP server (HTTP): ${endpoint}\nAuthorization: Bearer <your fleet:read key>`}</code>
      </pre>
      <h4 className="fleet-costs-title">Recent requests</h4>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!entries && !error && <p className="fleet-state">Loading...</p>}
      {entries && entries.length === 0 && <p className="fleet-muted">No assistant requests yet.</p>}
      {entries && entries.length > 0 && (
        <ul className="fleet-project-assignments">
          {entries.map((e) => (
            <li key={e.id}>
              <span>
                <strong>{e.tool ?? e.method}</strong> {e.ok ? '' : `· failed: ${e.error ?? 'error'}`}
              </span>
              <span className="fleet-muted">{new Date(e.createdAt).toLocaleString('en-GB')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
