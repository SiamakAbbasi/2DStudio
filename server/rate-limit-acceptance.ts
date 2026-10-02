process.env.GENERAL_RATE_LIMIT_PER_MINUTE = "6";
process.env.AUTH_RATE_LIMIT_PER_MINUTE = "20";
const [{ app }, { pool }] = await Promise.all([import("./app.js"), import("./db.js")]);
const request = (await import("supertest")).default;
const agent = request.agent(app), marker = Date.now(), email = `rate-${marker}@example.test`, password = `RateTest-${marker}!`;
try {
  const registered = await agent.post("/api/auth/register").set("X-Forwarded-For","203.0.113.99").send({email,password,confirmPassword:password});
  if (registered.status !== 201) throw new Error(`Registration failed: ${registered.status}`);
  let saw429 = false;
  for (let index=0; index<8; index++) {
    const result = await agent.get("/api/auth/me").set("X-Forwarded-For","203.0.113.99");
    if (result.status === 429) saw429 = true;
  }
  if (!saw429) throw new Error("General API did not return 429");
  console.log(JSON.stringify({"general within limit":true,"general exceeds limit returns 429":true},null,2));
} finally {
  await pool.query("DELETE FROM users WHERE email=$1",[email]);
  await pool.end();
}

