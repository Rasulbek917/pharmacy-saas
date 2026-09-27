// Local development PostgreSQL (zero-install, binaries from embedded-postgres).
// Usage: npm run db:start  ->  http://localhost:5432, db "dorixona_saas"
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Client } = require("pg");

const dataDir = join(process.cwd(), ".pgdata");
const PORT = Number(process.env.PG_PORT || 5432);
const DB_NAME = process.env.PG_DB || "dorixona_saas";

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
});

if (!existsSync(join(dataDir, "PG_VERSION"))) {
  console.log(`[db] Birinchi ishga tushirish: ${dataDir} yaratilmoqda...`);
  await pg.initialise();
}

await pg.start();
console.log(`[db] PostgreSQL tayyor: postgresql://postgres:postgres@localhost:${PORT}`);

const client = new Client({
  connectionString: `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres`,
});
await client.connect();
const dbExists = await client.query(
  "select 1 from pg_database where datname = $1",
  [DB_NAME]
);
if (dbExists.rowCount === 0) {
  await client.query(`CREATE DATABASE ${DB_NAME}`);
  console.log(`[db] "${DB_NAME}" bazasi yaratildi.`);
}
await client.end();

console.log(`[db] DATABASE_URL=postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}?schema=public`);
console.log("[db] Keyingi qadam: npx prisma migrate deploy && npm run prisma:seed");
console.log("[db] To'xtatish: Ctrl+C");

const shutdown = async () => {
  console.log("\n[db] To'xtatilmoqda...");
  try {
    await pg.stop();
  } catch {}
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
