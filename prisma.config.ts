import 'dotenv/config'
import { defineConfig, env } from 'prisma/config';

const fallbackDbUrl = "postgresql://user:pass@localhost:5432/db";

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations'
    },
    datasource: {
        url: process.env.DATABASE_URL || fallbackDbUrl,
    },
});