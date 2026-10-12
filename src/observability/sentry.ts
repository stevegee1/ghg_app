import * as Sentry from '@sentry/node';
import { scrubEvent } from '../utils/sentryScrub';

/**
 * Error reporting to Sentry. On when SENTRY_DSN is set; off (nothing sent) when it is not.
 * SENTRY_ENVIRONMENT names the environment (for example production or staging).
 * Personal data is removed from every report (src/utils/sentryScrub.ts).
 */

export const SENTRY_ENV = { dsn: 'SENTRY_DSN', environment: 'SENTRY_ENVIRONMENT' } as const;

export function readSentryConfig(): { dsn: string; environment: string } | null {
  const dsn = process.env[SENTRY_ENV.dsn]?.trim() ?? '';
  if (!dsn) return null;
  if (!/^https:\/\/[^@\s]+@[^/\s]+\/\d+$/.test(dsn)) throw new Error(`${SENTRY_ENV.dsn} must be the DSN from your Sentry project settings (https://...@.../<project id>).`);
  const environment = process.env[SENTRY_ENV.environment]?.trim() ?? '';
  if (!environment) throw new Error(`Set ${SENTRY_ENV.environment} (for example production) when ${SENTRY_ENV.dsn} is set.`);
  return { dsn, environment };
}

export function validateSentryConfig(): void {
  readSentryConfig();
}

let enabled = false;

export function isSentryEnabled(): boolean {
  return enabled;
}

/** Starts reporting. Routes catch their own errors and log them, so logged errors are reported too. */
export function initSentry(): void {
  const config = readSentryConfig();
  if (!config) return;
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    // Railway sets this to the deployed commit, so each report names the release it came from.
    release: process.env.RAILWAY_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
    beforeSend: (event) => scrubEvent(event),
  });
  enabled = true;
}

export { Sentry };
