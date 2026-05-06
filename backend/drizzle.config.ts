import type { Config } from 'drizzle-kit';

export default {
  schema: './src/persistence/schemas',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://norms:norms@localhost:5432/norms',
  },
} satisfies Config;
