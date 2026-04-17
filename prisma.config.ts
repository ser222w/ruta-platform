import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma CLI не читає .env.local автоматично — завантажуємо вручну
config({ path: '.env.local' });
config(); // fallback на .env

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
});
