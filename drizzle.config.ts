import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.POSTGRES_URL) {
  throw new Error('DATABASE_URL environment variable is required.');
}

export default defineConfig({
  schema: './lib/db.ts',
  out: './drizzle/migrations',
  driver: 'pglite',
  dialect: 'postgresql',

  dbCredentials: {
    url: process.env.POSTGRES_URL
  },
  verbose: true,
  strict: true
});
