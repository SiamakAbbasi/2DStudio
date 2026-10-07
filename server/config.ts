import fs from "node:fs";
import path from "node:path";

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const file = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
    }
  }
}
loadLocalEnv();

const integer = (name: string, fallback: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${name}`);
  return Math.floor(value);
};

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5432/2dstudio",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  port: integer("PORT", 5175),
  host: process.env.HOST ?? "127.0.0.1",
  appOrigin: process.env.APP_ORIGIN ?? "http://127.0.0.1:5174",
  generalRateLimit: integer("GENERAL_RATE_LIMIT_PER_MINUTE", 100),
  authRateLimit: integer("AUTH_RATE_LIMIT_PER_MINUTE", 5),
  projectBodyLimit: process.env.PROJECT_BODY_LIMIT ?? "10mb",
  localPasswordReset: process.env.LOCAL_PASSWORD_RESET !== "false" && process.env.NODE_ENV !== "production",
};

if (config.sessionSecret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
