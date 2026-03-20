import 'dotenv/config'
import { defineConfig, env } from 'prisma/config';

// IMPORTANT: Do not hardcode database credentials in the repo.
// The datasource URL must come from the environment (e.g. local `.env` / Vercel env var).
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations'
    },
    datasource: {
        url: databaseUrl ?? '',
    },
});