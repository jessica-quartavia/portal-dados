import type { Pool as PoolType, QueryResultRow } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: PoolType };

const blockedSqlPattern = /\b(insert|update|delete|drop|alter|truncate|create|merge|grant|revoke)\b/i;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL nao configurada para o dashboard IAP Maio 26.");
  }
  return databaseUrl;
}

function assertReadOnlySql(text: string) {
  if (blockedSqlPattern.test(text)) {
    throw new Error("Apenas consultas SELECT sao permitidas neste dashboard.");
  }
}

async function loadPoolConstructor() {
  const pg = await import(/* @vite-ignore */ "pg");
  return pg.Pool;
}

export async function getPool() {
  const databaseUrl = getDatabaseUrl();

  if (!globalForPg.pgPool) {
    const Pool = await loadPoolConstructor();
    globalForPg.pgPool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      ssl: databaseUrl.includes("supabase.co") || databaseUrl.includes("pooler.supabase.com")
        ? { rejectUnauthorized: false }
        : undefined,
      application_name: "iapmai26-dashboard"
    });
  }

  return globalForPg.pgPool;
}

export async function readOnlyQuery<T extends QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  assertReadOnlySql(text);

  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN READ ONLY");
    const result = await client.query<T>(text, values);
    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection() {
  const rows = await readOnlyQuery<{
    database_time: string;
    current_database: string;
    current_schema: string;
  }>(`
    SELECT
      NOW()::text AS database_time,
      current_database() AS current_database,
      current_schema() AS current_schema;
  `);

  return rows[0];
}
