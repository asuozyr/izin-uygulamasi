// server.js
// Express backend for the leave management app.
//
// Endpoints:
//   POST   /api/login                     -> { token, user }
//   GET    /api/me                         -> current user (requires auth)
//   GET    /api/employees                  -> list of employees (requires auth)
//   GET    /api/requests                   -> own requests (calisan) or all (yonetici, optional ?userId=)
//   POST   /api/requests                   -> create a request for the logged-in user
//   PATCH  /api/requests/:id               -> update status
//   GET    /api/calendar?year=&month=      -> approved requests for the given month
//
// Database: PostgreSQL (designed for Cloud SQL).

const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "demo-secret-change-me";

// ---------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------
const pool = new Pool(
  process.env.INSTANCE_CONNECTION_NAME
    ? {
        host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
    : {
        connectionString:
          process.env.DATABASE_URL ||
          "postgresql://postgres:postgres@localhost:5432/izin",
      }
);

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function diffDays(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const d = Math.round((e - s) / 86400000) + 1;
  return d > 0 ? d : 1;
}

const VALID_TYPES = ["yillik", "mazeret", "hastalik", "ucretsiz"];
const VALID_STATUSES = ["beklemede", "onaylandi", "reddedildi"];

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    balance: row.balance,
    role: row.role,
    email: row.email,
  };
}

// ---------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Oturum bulunamadı. Lütfen giriş yapın." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın." });
  }
}

// ---------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------

// POST /api/login  body: { email, password }
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-posta ve şifre gerekli." });
    }

    const { rows } = await pool.query(
      "SELECT id, name, initials, balance, role, email, password_hash FROM employees WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    const user = rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "E-posta veya şifre hatalı." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "E-posta veya şifre hatalı." });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Giriş yapılamadı." });
  }
});

// GET /api/me
app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, initials, balance, role, email FROM employees WHERE id = $1",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    res.json(publicUser(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Kullanıcı bilgisi getirilemedi." });
  }
});

// ---------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------

// GET /api/employees  (requires auth)
app.get("/api/employees", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, initials, balance, role, email FROM employees ORDER BY name"
    );
    res.json(rows.map(publicUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Çalışanlar getirilemedi." });
  }
});

// ---------------------------------------------------------------------
// Leave requests
// ---------------------------------------------------------------------

// GET /api/requests  -> own requests for "calisan", optional ?userId= filter for "yonetici"
app.get("/api/requests", requireAuth, async (req, res) => {
  try {
    let query = `
      SELECT id, user_id AS "userId", type,
             start_date::text AS "start",
             end_date::text AS "end",
             days, reason, status
      FROM leave_requests
    `;
    const params = [];

    if (req.user.role === "yonetici") {
      if (req.query.userId) {
        query += " WHERE user_id = $1";
        params.push(req.query.userId);
      }
    } else {
      query += " WHERE user_id = $1";
      params.push(req.user.id);
    }

    query += " ORDER BY id DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Talepler getirilemedi." });
  }
});

// POST /api/requests  body: { type, start, end, reason } - userId taken from token
app.post("/api/requests", requireAuth, async (req, res) => {
  try {
    const { type, start, end, reason } = req.body;

    if (!type || !start || !end) {
      return res.status(400).json({ error: "Eksik alanlar var." });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Geçersiz izin türü." });
    }
    if (new Date(end) < new Date(start)) {
      return res.status(400).json({ error: "Bitiş tarihi başlangıçtan önce olamaz." });
    }

    const days = diffDays(start, end);

    const { rows } = await pool.query(
      `INSERT INTO leave_requests (user_id, type, start_date, end_date, days, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'beklemede')
       RETURNING id, user_id AS "userId", type,
                 start_date::text AS "start",
                 end_date::text AS "end",
                 days, reason, status`,
      [req.user.id, type, start, end, days, reason || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Talep oluşturulamadı." });
  }
});

// PATCH /api/requests/:id  body: { status }
// - Managers can set any status on any request.
// - Employees may only cancel (set to 'reddedildi') their own pending requests.
app.patch("/api/requests/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Geçersiz durum." });
    }

    if (req.user.role !== "yonetici") {
      const { rows: existingRows } = await pool.query(
        `SELECT user_id AS "userId", status FROM leave_requests WHERE id = $1`,
        [id]
      );
      const existing = existingRows[0];
      if (!existing) return res.status(404).json({ error: "Talep bulunamadı." });
      if (existing.userId !== req.user.id) {
        return res.status(403).json({ error: "Bu talebi değiştirme yetkiniz yok." });
      }
      if (status !== "reddedildi" || existing.status !== "beklemede") {
        return res.status(403).json({ error: "Sadece beklemede olan kendi talebinizi iptal edebilirsiniz." });
      }
    }

    const { rows } = await pool.query(
      `UPDATE leave_requests SET status = $1 WHERE id = $2
       RETURNING id, user_id AS "userId", type,
                 start_date::text AS "start",
                 end_date::text AS "end",
                 days, reason, status`,
      [status, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Talep bulunamadı." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Talep güncellenemedi." });
  }
});

// GET /api/calendar?year=2026&month=6
app.get("/api/calendar", requireAuth, async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: "Geçersiz yıl veya ay." });
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const { rows } = await pool.query(
      `SELECT lr.start_date::text AS "start", lr.end_date::text AS "end", lr.type,
              e.name, e.initials
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.user_id
       WHERE lr.status = 'onaylandi'
         AND lr.start_date <= $2
         AND lr.end_date >= $1`,
      [monthStart.toISOString().slice(0, 10), monthEnd.toISOString().slice(0, 10)]
    );

    const result = {};
    for (const row of rows) {
      const start = new Date(Math.max(new Date(row.start), monthStart));
      const end = new Date(Math.min(new Date(row.end), monthEnd));
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = String(d.getDate());
        if (!result[day]) result[day] = [];
        result[day].push({ name: row.name, initials: row.initials, type: row.type });
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Takvim verisi getirilemedi." });
  }
});

// ---------------------------------------------------------------------
// Serve frontend build
// ---------------------------------------------------------------------
const FRONTEND_DIST = path.join(__dirname, "frontend", "dist");
app.use(express.static(FRONTEND_DIST));
app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`İzin uygulaması API ${PORT} portunda çalışıyor`);
});
