import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";

await pool.query("SELECT 1");
app.listen(config.port, "127.0.0.1", () => console.log(`2D Flip Studio API: http://127.0.0.1:${config.port}`));

