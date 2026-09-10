import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

export default async function globalSetup() {
  // Load .env.test for global setup process
  dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

  console.log('\n[Jest Global Setup] Syncing Prisma schema on test database (ghg_logodrop_test)...');
  try {
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env },
      stdio: 'inherit',
    });
  } catch (err: any) {
    console.warn('⚠️  [Jest Global Setup] DB sync failed (check local PostgreSQL at 127.0.0.1:5432):', err?.message || err);
  }
}
