import 'dotenv/config';
import { initSentry } from './observability/sentry';

// Imported first by src/index.ts so errors during start-up are reported too.
try {
  initSentry();
} catch (err) {
  console.error(`FATAL: Error reporting configuration is invalid. ${(err as Error).message} Refusing to start.`);
  process.exit(1);
}
