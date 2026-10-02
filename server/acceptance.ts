import request from "supertest";
import { app } from "./app.js";
import { pool } from "./db.js";

const marker = Date.now();
const password = `LocalTest-${marker}!`;
const userAEmail = `accept-a-${marker}@example.test`;
const userBEmail = `accept-b-${marker}@example.test`;
const userA = request.agent(app), userB = request.agent(app);
const checks: Record<string, boolean> = {};
const expect = (name: string, condition: unknown) => { checks[name] = Boolean(condition); if (!condition) throw new Error(`Failed: ${name}`); };

try {
  let response = await userA.post("/api/auth/register").send({ email: userAEmail, password, confirmPassword: password });
  expect("register A", response.status === 201 && response.body.user.role === "USER");
  response = await userB.post("/api/auth/register").send({ email: userBEmail, password, confirmPassword: password });
  expect("register B", response.status === 201 && response.body.user.role === "USER");
  expect("password hashed", (await pool.query("SELECT password_hash FROM users WHERE email=$1", [userAEmail])).rows[0].password_hash !== password);

  const projectData: any = { version: 1, name: "Fight Test", duration: 5, fps: 24, format: { label: "16:9", width: 1920, height: 1080 }, characters: [{ id: "a" }, { id: "b" }], tracks: { a: [], b: [] }, props: [], propTracks: {}, camera: [], speed: [], effects: [], background: {}, savedPoses: {}, trail: 1 };
  response = await userA.post("/api/projects").send({ name: "Fight Test", projectData });
  const project = response.body.project;
  expect("create", response.status === 201 && project.version === 1);
  response = await userA.get(`/api/projects/${project.id}`);
  expect("read", response.status === 200 && response.body.project.projectData.characters.length === 2);
  const openedAt = response.body.project.lastOpenedAt;
  projectData.tracks.a.push({ time: 1, pose: { root: { x: 1, y: 2 } } });
  response = await userA.put(`/api/projects/${project.id}`).send({ version: 1, projectData });
  expect("update/version", response.status === 200 && response.body.project.version === 2);
  response = await userA.put(`/api/projects/${project.id}`).send({ version: 1, projectData: { ...projectData, duration: 9 } });
  expect("stale conflict", response.status === 409);
  response = await userA.patch(`/api/projects/${project.id}`).send({ name: "Fight Test Renamed" });
  expect("rename", response.status === 200 && response.body.project.name === "Fight Test Renamed");
  response = await userA.post(`/api/projects/${project.id}/duplicate`).send({ name: "Fight Test Copy" });
  const duplicate = response.body.project;
  expect("duplicate data", response.status === 201 && duplicate.projectData.tracks.a.length === 1);
  response = await userA.delete(`/api/projects/${duplicate.id}`);
  expect("delete", response.status === 204);

  for (const [method, suffix, body] of [["get","",null],["put","",{version:3,projectData}],["patch","",{name:"stolen"}],["post","/duplicate",{}],["delete","",null]] as const) {
    const call = (userB as any)[method](`/api/projects/${project.id}${suffix}`);
    response = body ? await call.send(body) : await call;
    expect(`ownership ${method}${suffix}`, response.status === 404);
  }
  response = await userB.get("/api/owner/settings"); expect("owner read rejected", response.status === 403);
  response = await userB.put("/api/owner/settings").send({}); expect("owner write rejected", response.status === 403);
  await pool.query("UPDATE users SET role='OWNER' WHERE email=$1", [userBEmail]);
  response = await userB.get("/api/owner/settings"); expect("owner read", response.status === 200);
  response = await userB.put("/api/owner/settings").send({ goalTitle:"Support test",goalDescription:"Test",goalIcon:"♥",currentAmount:5,goalAmount:100,currency:"EUR",paypalUrl:"https://www.paypal.com/donate",quickAmounts:[3,5,10],allowCustomAmount:true,showProgress:true,isVisible:true });
  expect("owner write", response.status === 200 && response.body.settings.goal_title === "Support test");
  response = await request(app).get("/api/support"); expect("public support", response.status === 200 && response.body.settings.isVisible === true);

  await userA.post("/api/auth/logout");
  response = await userA.post("/api/auth/login").send({ email:userAEmail,password }); expect("relogin", response.status === 200);
  response = await userA.get(`/api/projects/${project.id}`); expect("relogin persistence", response.status === 200 && response.body.project.projectData.tracks.a.length === 1);
  expect("last opened", new Date(response.body.project.lastOpenedAt).getTime() >= new Date(openedAt).getTime());

  const authIp = "203.0.113.88";
  let limited = false;
  for (let i=0;i<6;i++) { response = await request(app).post("/api/auth/login").set("X-Forwarded-For",authIp).send({email:"nobody@example.test",password:"wrong-password"}); if(response.status===429)limited=true; }
  expect("auth rate limit", limited);

  const large = "x".repeat(11 * 1024 * 1024);
  response = await userA.post("/api/projects").send({name:"Too large",projectData:{large}});
  expect("request size", response.status === 413);

  console.log(JSON.stringify(checks, null, 2));
} finally {
  await pool.query("DELETE FROM users WHERE email IN ($1,$2)", [userAEmail,userBEmail]);
  await pool.query("UPDATE donation_settings SET is_visible=false WHERE goal_title='Support test'");
  await pool.end();
}

