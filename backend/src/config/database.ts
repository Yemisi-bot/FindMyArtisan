import { Pool } from 'pg';

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    // Load dotenv at pool creation time to ensure env vars are available
    require('dotenv').config();
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return _pool;
}

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const pool = getPool();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB] Query executed in ${duration}ms - rows: ${result.rowCount}`);
  }
  return result;
}

export async function getClient() {
  const pool = getPool();
  const client = await pool.connect();
  return client;
}

export { getPool as pool };
export default getPool;
