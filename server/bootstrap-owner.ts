import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.OWNER_PASSWORD;
if (!email || !password || password.length < 10) throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD (10+ characters) in local environment");
const hash = await bcrypt.hash(password, 12);
await pool.query(
  `INSERT INTO users(email,password_hash,role) VALUES($1,$2,'OWNER')
   ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='OWNER', updated_at=now()`,
  [email, hash],
);
console.log(`Owner ready: ${email}`);
await pool.end();

