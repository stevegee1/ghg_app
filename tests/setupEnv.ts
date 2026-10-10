import dotenv from 'dotenv';
import path from 'path';

// Force load .env.test for Jest environment before any app modules or Prisma instances load
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

// Tests must never send real email. Prisma loads the developer's .env later and fills in variables
// that are not already set, so the provider keys are set to empty here; delivery then only logs.
for (const key of ['RESEND_API_KEY', 'SENDGRID_API_KEY']) process.env[key] = '';
