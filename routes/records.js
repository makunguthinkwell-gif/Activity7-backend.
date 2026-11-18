const router = require("express").Router();
const pool = require("../db");

const STATUSES = ["Pending", "In progress", "Completed"];
const COLUMNS = "id, title, category, description, status";

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function parseId(value) {
  if (!/^\d+$/.test(value)) throw new HttpError(400, "Id must be a positive whole number.");
  const id = Number(value);
  if (id < 1 || id > 2147483647) throw new HttpError(400, "Id must be a positive whole number.");
  return id;
}

function checkText(body, field, label, min, max) {
  if (typeof body[field] !== "string") throw new HttpError(400, `${label} is required and must be text.`);
  const value = body[field].trim();
  if (value.length < min || value.length > max) {
    throw new HttpError(400, `${label} must have ${min} to ${max} characters.`);
  }
  return value;
}

function validate(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
  const record = {
    title: checkText(body, "title", "Title", 3, 80),
    category: checkText(body, "category", "Category", 2, 40),
    description: checkText(body, "description", "Description", 5, 300),
    status: checkText(body, "status", "Status", 1, 40)
  };
  if (!STATUSES.includes(record.status)) {
    throw new HttpError(400, "Status must be Pending, In progress or Completed.");
  }
  return record;
}

const notFound = () => new HttpError(404, "Record not found.");

router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM records ORDER BY id`);
    res.status(200).json(result.rows);
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const result = await pool.query(`SELECT ${COLUMNS} FROM records WHERE id = $1`, [id]);
    if (result.rowCount === 0) throw notFound();
    res.status(200).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const r = validate(req.body); // any client-supplied id is ignored
    const result = await pool.query(
      `INSERT INTO records (title, category, description, status)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [r.title, r.category, r.description, r.status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const r = validate(req.body);
    const result = await pool.query(
      `UPDATE records SET title = $1, category = $2, description = $3, status = $4
       WHERE id = $5 RETURNING ${COLUMNS}`,
      [r.title, r.category, r.description, r.status, id]
    );
    if (result.rowCount === 0) throw notFound();
    res.status(200).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const result = await pool.query("DELETE FROM records WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) throw notFound();
    res.status(200).json({ message: "Record deleted." });
  } catch (error) { next(error); }
});

module.exports = router;
