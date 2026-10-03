import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

export default async function globalSetup() {
  // Load .env.test for global setup process
  dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

  const databaseUrl = process.env.DATABASE_URL || '';
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_test')) {
    throw new Error(`[Jest Global Setup] Refusing to reset database '${databaseName}': test database names must end with '_test'.`);
  }

  // Rebuild the test database from the committed migrations so tests run against the
  // same schema, enum history and row-level security policies as production.
  console.log(`\n[Jest Global Setup] Resetting ${databaseName} from prisma/migrations...`);
  execSync('npx prisma migrate reset --force --skip-generate --skip-seed', {
    env: { ...process.env },
    stdio: 'inherit',
  });
}
