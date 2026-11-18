const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const url = process.env.DATABASE_URL || "";
const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);

const pool = new Pool({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

// Creates the table and inserts the starting records once (only when the table is empty).
async function init() {
  await pool.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM records");
  if (rows[0].n === 0) {
    await pool.query(fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8"));
    console.log("Seeded starting records.");
  }
}

module.exports = pool;
module.exports.init = init;
