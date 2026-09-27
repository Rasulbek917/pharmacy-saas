// Production database restore: SQLite (file copy) yoki PostgreSQL (pg_restore).
// Ishlatish: node scripts/restore.mjs backups/backup-<stamp>.db
// DIQQAT: restore joriy database ustiga yozadi — avval yangi backup oling!
import { copyFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadEnv() {
  try {
    const raw = await readFile(path.join(root, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env mavjud bo'lmasa, tizim env o'zgaruvchilari ishlatiladi
  }
}
await loadEnv();

const DATABASE_URL = process.env.DATABASE_URL || "";
const backupFile = process.argv[2];

if (!backupFile || !existsSync(backupFile)) {
  console.error(
    "✗ Backup fayli ko‘rsatilmadi yoki topilmadi. Misol: node scripts/restore.mjs backups/backup-2026-09-26T00-00-00.db"
  );
  process.exit(1);
}

if (backupFile.endsWith(".dump") || DATABASE_URL.startsWith("postgresql")) {
  execFileSync("pg_restore", ["--clean", "--if-exists", "--dbname", DATABASE_URL, backupFile], {
    stdio: "inherit",
  });
  console.log("✓ PostgreSQL restore yakunlandi");
} else if (DATABASE_URL.startsWith("file:")) {
  const rel = DATABASE_URL.replace("file:", "");
  const dbFile = path.resolve(path.join(root, "prisma"), rel);
  await copyFile(path.resolve(backupFile), dbFile);
  console.log(`✓ SQLite restore yakunlandi: ${dbFile}`);
} else {
  console.error("✗ DATABASE_URL aniqlanmadi yoki qo‘llab-quvvatlanmaydi");
  process.exit(1);
}
