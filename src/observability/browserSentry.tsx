import React from 'react';
import * as Sentry from '@sentry/react';
import { scrubEvent } from '../utils/sentryScrub';

/**
 * Browser error reporting, using the same Sentry project as the server: the settings come from
 * GET /api/public/client-config, so nothing is baked into the build. Off when the server has no
 * SENTRY_DSN. Personal data is removed from every report.
 */
export async function initBrowserSentry(): Promise<void> {
  try {
    const res = await fetch('/api/public/client-config');
    if (!res.ok) return;
    const config = (await res.json()) as { sentry: { dsn: string; environment: string; release: string | null } | null };
    if (!config.sentry) return;
    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.sentry.environment,
      release: config.sentry.release ?? undefined,
      sendDefaultPii: false,
      beforeSend: (event) => scrubEvent(event),
    });
  } catch {
    // Reporting is best effort; the app works without it.
  }
}

const Fallback: React.FC = () => (
  <main className="app-crash" role="alert">
    <h1>Something went wrong</h1>
    <p>The page hit an error. It has been reported. Reload to try again.</p>
    <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
      Reload
    </button>
  </main>
);

/** Shows a plain message instead of a blank page when the app crashes, and reports the crash. */
export const AppErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Sentry.ErrorBoundary fallback={<Fallback />}>{children}</Sentry.ErrorBoundary>
);
