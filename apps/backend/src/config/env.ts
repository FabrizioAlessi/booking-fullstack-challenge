import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config();

const slotLockTtlSeconds = Number(process.env.SLOT_LOCK_TTL_SECONDS ?? 60);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: process.env.MONGODB_URI?.trim() ?? '',
  slotLockTtlMs: (Number.isFinite(slotLockTtlSeconds) ? slotLockTtlSeconds : 60) * 1000,
};

export function requireMongoUri(): string {
  if (!env.mongodbUri) {
    throw new Error(
      'MONGODB_URI is required. Copy .env.example to .env and set your MongoDB Atlas connection string.',
    );
  }
  return env.mongodbUri;
}
