import fs from "node:fs/promises";
import path from "node:path";
import { pool, transaction } from "./db.js";

const directory = path.resolve(process.cwd(), "server/migrations");
await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
for (const name of (await fs.readdir(directory)).filter((file) => file.endsWith(".sql")).sort()) {
  const exists = await pool.query("SELECT 1 FROM schema_migrations WHERE name=$1", [name]);
  if (exists.rowCount) continue;
  const sql = await fs.readFile(path.join(directory, name), "utf8");
  await transaction(async (client) => {
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [name]);
  });
  console.log(`Applied ${name}`);
}
await pool.end();

