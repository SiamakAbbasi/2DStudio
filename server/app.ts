import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { config } from "./config.js";
import { pool } from "./db.js";

const PgStore = connectPgSimple(session);
type Role = "USER" | "OWNER";
type AuthUser = { id: string; email: string; displayName: string | null; avatarUrl: string | null; role: Role };

declare global {
  namespace Express { interface Request { authUser?: AuthUser } }
}

const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const publicUser = (row: any): AuthUser => ({ id: row.id, email: row.email, displayName: row.display_name, avatarUrl: row.avatar_url, role: row.role });
const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");
const projectView = (row: any) => ({
  id: row.id, name: row.name, description: row.description, projectData: row.project_data,
  thumbnailUrl: row.thumbnail_url, createdAt: row.created_at, updatedAt: row.updated_at,
  lastOpenedAt: row.last_opened_at, version: row.version,
});

export const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: config.projectBodyLimit }));
app.use(session({
  store: new PgStore({ pool, tableName: "user_sessions", createTableIfMissing: false }),
  name: "studio.sid",
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 24 * 14 },
}));

app.use(async (req, _res, next) => {
  if (!req.session.userId) return next();
  try {
    const result = await pool.query("SELECT id,email,display_name,avatar_url,role FROM users WHERE id=$1", [req.session.userId]);
    if (result.rowCount) req.authUser = publicUser(result.rows[0]);
    else req.session.userId = undefined;
    next();
  } catch (error) { next(error); }
});

const generalLimiter = rateLimit({
  windowMs: 60_000, limit: config.generalRateLimit, standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (req) => req.authUser?.id ?? ipKeyGenerator(req.ip ?? "127.0.0.1"),
  message: { error: "Too many requests. Please try again shortly." },
});
const authLimiter = rateLimit({
  windowMs: 60_000, limit: config.authRateLimit, standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "127.0.0.1"),
  message: { error: "Too many authentication attempts. Please wait one minute." },
});
app.use("/api", generalLimiter);

const requireAuth = (req: Request, res: Response, next: NextFunction) => req.authUser ? next() : res.status(401).json({ error: "Authentication required" });
const requireOwner = (req: Request, res: Response, next: NextFunction) => req.authUser?.role === "OWNER" ? next() : res.status(403).json({ error: "Owner access required" });

app.get("/api/health", async (_req, res, next) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true }); } catch (error) { next(error); }
});
app.post("/api/auth/register", authLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email), password = String(req.body.password ?? ""), confirm = String(req.body.confirmPassword ?? "");
    if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < 10 || password.length > 200) return res.status(400).json({ error: "Password must contain 10–200 characters." });
    if (password !== confirm) return res.status(400).json({ error: "Passwords do not match." });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users(email,password_hash,role) VALUES($1,$2,'USER') RETURNING id,email,display_name,avatar_url,role",
      [email, hash],
    );
    req.session.userId = result.rows[0].id;
    res.status(201).json({ user: publicUser(result.rows[0]) });
  } catch (error: any) {
    if (error?.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
    next(error);
  }
});
app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email), password = String(req.body.password ?? "");
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].password_hash))) return res.status(401).json({ error: "Email or password is incorrect." });
    await pool.query("UPDATE users SET last_login_at=now(),updated_at=now() WHERE id=$1", [result.rows[0].id]);
    req.session.userId = result.rows[0].id;
    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) { next(error); }
});
app.post("/api/auth/forgot-password", authLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
    const result = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    let developmentResetToken: string | undefined;
    if (result.rowCount) {
      const userId = result.rows[0].id, token = randomBytes(32).toString("base64url");
      await pool.query("DELETE FROM password_reset_tokens WHERE user_id=$1 OR expires_at<=now()", [userId]);
      await pool.query("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '15 minutes')", [userId, hashResetToken(token)]);
      if (config.localPasswordReset) developmentResetToken = token;
    }
    res.json({ message: config.localPasswordReset ? "If the account exists, a local one-time reset link is ready." : "If the account exists, a reset request has been recorded.", developmentResetToken });
  } catch (error) { next(error); }
});
app.post("/api/auth/reset-password", authLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const token = String(req.body.token ?? ""), password = String(req.body.password ?? ""), confirm = String(req.body.confirmPassword ?? "");
    if (token.length < 20) return res.status(400).json({ error: "This reset link is invalid." });
    if (password.length < 10 || password.length > 200) return res.status(400).json({ error: "Password must contain 10–200 characters." });
    if (password !== confirm) return res.status(400).json({ error: "Passwords do not match." });
    await client.query("BEGIN");
    const reset = await client.query("SELECT id,user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE", [hashResetToken(token)]);
    if (!reset.rowCount) { await client.query("ROLLBACK"); return res.status(400).json({ error: "This reset link is invalid or has expired." }); }
    const hash = await bcrypt.hash(password, 12), userId = reset.rows[0].user_id;
    await client.query("UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2", [hash, userId]);
    await client.query("UPDATE password_reset_tokens SET used_at=now() WHERE id=$1", [reset.rows[0].id]);
    await client.query("DELETE FROM user_sessions WHERE sess::jsonb->>'userId'=$1", [String(userId)]);
    await client.query("COMMIT");
    res.json({ message: "Password updated. You can now sign in." });
  } catch (error) { await client.query("ROLLBACK").catch(()=>{}); next(error); } finally { client.release(); }
});
app.post("/api/auth/logout", requireAuth, (req, res, next) => req.session.destroy((error) => error ? next(error) : res.status(204).end()));
app.get("/api/auth/me", (req, res) => res.json({ user: req.authUser ?? null }));

app.get("/api/projects", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT id,name,description,thumbnail_url,created_at,updated_at,last_opened_at,version FROM projects WHERE user_id=$1 ORDER BY updated_at DESC", [req.authUser!.id]);
    res.json({ projects: result.rows.map(projectView) });
  } catch (error) { next(error); }
});
app.post("/api/projects", requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim(), data = req.body.projectData;
    if (!name || name.length > 120) return res.status(400).json({ error: "Project name is required (maximum 120 characters)." });
    if (!data || typeof data !== "object" || Array.isArray(data)) return res.status(400).json({ error: "Valid ProjectData is required." });
    data.name = name;
    const result = await pool.query("INSERT INTO projects(user_id,name,description,project_data) VALUES($1,$2,$3,$4) RETURNING *", [req.authUser!.id, name, req.body.description || null, data]);
    res.status(201).json({ project: projectView(result.rows[0]) });
  } catch (error) { next(error); }
});
app.get("/api/projects/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("UPDATE projects SET last_opened_at=now() WHERE id=$1 AND user_id=$2 RETURNING *", [req.params.id, req.authUser!.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Project not found." });
    res.json({ project: projectView(result.rows[0]) });
  } catch (error) { next(error); }
});
app.put("/api/projects/:id", requireAuth, async (req, res, next) => {
  try {
    const version = Number(req.body.version), data = req.body.projectData;
    if (!Number.isInteger(version) || !data || typeof data !== "object") return res.status(400).json({ error: "ProjectData and current version are required." });
    const result = await pool.query(
      "UPDATE projects SET project_data=$1,updated_at=now(),version=version+1 WHERE id=$2 AND user_id=$3 AND version=$4 RETURNING *",
      [data, req.params.id, req.authUser!.id, version],
    );
    if (!result.rowCount) {
      const owns = await pool.query("SELECT version FROM projects WHERE id=$1 AND user_id=$2", [req.params.id, req.authUser!.id]);
      if (!owns.rowCount) return res.status(404).json({ error: "Project not found." });
      return res.status(409).json({ error: "Project changed in another session.", currentVersion: owns.rows[0].version });
    }
    res.json({ project: projectView(result.rows[0]) });
  } catch (error) { next(error); }
});
app.patch("/api/projects/:id", requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name || name.length > 120) return res.status(400).json({ error: "Valid project name is required." });
    const result = await pool.query("UPDATE projects SET name=$1::varchar,project_data=jsonb_set(project_data,'{name}',to_jsonb($1::text)),updated_at=now(),version=version+1 WHERE id=$2 AND user_id=$3 RETURNING *", [name, req.params.id, req.authUser!.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Project not found." });
    res.json({ project: projectView(result.rows[0]) });
  } catch (error) { next(error); }
});
app.post("/api/projects/:id/duplicate", requireAuth, async (req, res, next) => {
  try {
    const requested = String(req.body.name ?? "").trim();
    const result = await pool.query(
      `INSERT INTO projects(user_id,name,description,project_data,thumbnail_url)
       SELECT user_id,COALESCE(NULLIF($1,''),name || ' Copy'),description,
       jsonb_set(project_data,'{name}',to_jsonb(COALESCE(NULLIF($1,''),name || ' Copy')::text)),thumbnail_url
       FROM projects WHERE id=$2 AND user_id=$3 RETURNING *`, [requested, req.params.id, req.authUser!.id],
    );
    if (!result.rowCount) return res.status(404).json({ error: "Project not found." });
    res.status(201).json({ project: projectView(result.rows[0]) });
  } catch (error) { next(error); }
});
app.delete("/api/projects/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM projects WHERE id=$1 AND user_id=$2 RETURNING id", [req.params.id, req.authUser!.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Project not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get("/api/support", async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT goal_title,goal_description,goal_icon,current_amount,goal_amount,currency,paypal_url,quick_amounts,allow_custom_amount,show_progress,is_visible,updated_at FROM donation_settings ORDER BY updated_at DESC LIMIT 1");
    const row = result.rows[0];
    res.json({ settings: row ? { goalTitle: row.goal_title, goalDescription: row.goal_description, goalIcon: row.goal_icon, currentAmount: Number(row.current_amount), goalAmount: Number(row.goal_amount), currency: row.currency, paypalUrl: row.paypal_url, quickAmounts: row.quick_amounts, allowCustomAmount: row.allow_custom_amount, showProgress: row.show_progress, isVisible: row.is_visible, updatedAt: row.updated_at } : null });
  } catch (error) { next(error); }
});
app.get("/api/owner/settings", requireAuth, requireOwner, async (_req, res, next) => {
  try { const result = await pool.query("SELECT * FROM donation_settings ORDER BY updated_at DESC LIMIT 1"); res.json({ settings: result.rows[0] }); } catch (error) { next(error); }
});
app.put("/api/owner/settings", requireAuth, requireOwner, async (req, res, next) => {
  try {
    const b = req.body, amounts = Array.isArray(b.quickAmounts) ? b.quickAmounts.map(Number).filter((n: number) => n > 0).slice(0, 8) : [];
    if (!String(b.goalTitle ?? "").trim() || Number(b.goalAmount) <= 0 || !/^[A-Z]{3}$/.test(String(b.currency ?? "")) || !amounts.length) return res.status(400).json({ error: "Complete the required support settings." });
    if (b.paypalUrl && !/^https:\/\/(www\.)?paypal\.com\//i.test(String(b.paypalUrl))) return res.status(400).json({ error: "Use an https://paypal.com support URL." });
    const result = await pool.query(
      `UPDATE donation_settings SET goal_title=$1,goal_description=$2,goal_icon=$3,current_amount=$4,goal_amount=$5,currency=$6,paypal_url=$7,quick_amounts=$8,allow_custom_amount=$9,show_progress=$10,is_visible=$11,updated_at=now() RETURNING *`,
      [String(b.goalTitle).trim(), String(b.goalDescription ?? "").trim(), b.goalIcon || null, Number(b.currentAmount) || 0, Number(b.goalAmount), String(b.currency), String(b.paypalUrl ?? ""), JSON.stringify(amounts), Boolean(b.allowCustomAmount), Boolean(b.showProgress), Boolean(b.isVisible)],
    );
    res.json({ settings: result.rows[0] });
  } catch (error) { next(error); }
});

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(process.cwd(), "dist");
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  if (error?.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });
  res.status(500).json({ error: "Unexpected server error." });
});
