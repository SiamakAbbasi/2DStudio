import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";

await pool.query("SELECT 1");
app.listen(config.port, config.host, () => console.log(`2D Flip Studio API: http://${config.host}:${config.port}`));
