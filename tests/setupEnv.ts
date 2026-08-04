import dotenv from 'dotenv';
import path from 'path';

// Force load .env.test for Jest environment before any app modules or Prisma instances load
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
