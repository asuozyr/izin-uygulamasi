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

require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { OAuth2Client } = require("google-auth-library");

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "demo-secret-change-me";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Bu e-postalar girişte yönetici (admin) rolü alır (virgülle ayrılmış).
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

if (!GOOGLE_CLIENT_ID) {
  console.warn("UYARI: GOOGLE_CLIENT_ID tanımlı değil. backend/.env dosyasını kontrol edin.");
}

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
        // Yönetilen Postgres (Render vb.) SSL ister; lokal Docker istemez.
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
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
    avatarUrl: row.avatar_url || null,
  };
}

// Ad soyaddan baş harfler üretir (ör. "Ayşe Kaya" -> "AK").
function initialsFromName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

// Yalnızca yönetici (admin) erişimi.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "yonetici") {
    return res.status(403).json({ error: "Bu işlem için yönetici yetkisi gerekli." });
  }
  next();
}

// ---------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------

// POST /api/auth/google  body: { credential }
// credential = Google Identity Services tarafından üretilen ID token.
// Token Google tarafından imza + audience (Client ID) doğrulaması yapılarak güvenle çözülür.
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Google kimlik bilgisi (credential) eksik." });
    }
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "Sunucuda GOOGLE_CLIENT_ID tanımlı değil." });
    }

    // ID token'ı doğrula
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (e) {
      return res.status(401).json({ error: "Google kimliği doğrulanamadı." });
    }

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({ error: "Doğrulanmış bir Google e-postası gerekli." });
    }

    const googleId = payload.sub;
    const email = payload.email.trim().toLowerCase();
    const name = payload.name || email;
    const avatar = payload.picture || null;
    const initials = initialsFromName(name);
    const wantsAdmin = ADMIN_EMAILS.has(email);

    // 1) Google ID ile eşle
    let { rows } = await pool.query(
      "SELECT id, role FROM employees WHERE google_id = $1",
      [googleId]
    );
    let employee = rows[0];

    // 2) Yoksa e-posta ile eşle (mevcut kayıtla bağla)
    if (!employee) {
      ({ rows } = await pool.query(
        "SELECT id, role FROM employees WHERE email = $1",
        [email]
      ));
      employee = rows[0];
      if (employee) {
        await pool.query(
          "UPDATE employees SET google_id = $1, avatar_url = $2, name = $3, initials = $4 WHERE id = $5",
          [googleId, avatar, name, initials, employee.id]
        );
      }
    } else {
      // Mevcut kullanıcı: ad ve profil fotoğrafını güncelle
      await pool.query(
        "UPDATE employees SET avatar_url = $1, name = $2 WHERE id = $3",
        [avatar, name, employee.id]
      );
    }

    // 3) Hâlâ yoksa yeni çalışan kaydı oluştur (JIT provisioning)
    if (!employee) {
      const role = wantsAdmin ? "yonetici" : "calisan";
      ({ rows } = await pool.query(
        `INSERT INTO employees (id, name, initials, balance, role, email, google_id, avatar_url)
         VALUES ($1, $2, $3, 14, $4, $5, $6, $7)
         RETURNING id, role`,
        [googleId, name, initials, role, email, googleId, avatar]
      ));
      employee = rows[0];
    } else if (wantsAdmin && employee.role !== "yonetici") {
      // Admin e-postasıysa rolü yükselt
      await pool.query("UPDATE employees SET role = 'yonetici' WHERE id = $1", [employee.id]);
      employee.role = "yonetici";
    }

    // Güncel tam kaydı çek
    const { rows: finalRows } = await pool.query(
      "SELECT id, name, initials, balance, role, email, avatar_url FROM employees WHERE id = $1",
      [employee.id]
    );
    const full = finalRows[0];

    // Oturumun açık kalması için 7 günlük JWT
    const token = jwt.sign({ id: full.id, role: full.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: publicUser(full) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Giriş yapılamadı." });
  }
});

// GET /api/me
app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, initials, balance, role, email, avatar_url FROM employees WHERE id = $1",
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

// GET /api/employees  (yalnızca yönetici)
app.get("/api/employees", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, initials, balance, role, email, avatar_url FROM employees ORDER BY name"
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
             days, reason, status,
             start_time AS "startTime", end_time AS "endTime",
             return_date::text AS "returnDate", location,
             contact_phone AS "contactPhone"
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

// POST /api/requests  body: { type, start, end, reason, startTime, endTime, returnDate, location, contactPhone }
app.post("/api/requests", requireAuth, async (req, res) => {
  try {
    const { type, start, end, reason, startTime, endTime, returnDate, location, contactPhone } = req.body;

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
      `INSERT INTO leave_requests
         (user_id, type, start_date, end_date, days, reason, start_time, end_time, return_date, location, contact_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'beklemede')
       RETURNING id, user_id AS "userId", type,
                 start_date::text AS "start",
                 end_date::text AS "end",
                 days, reason, status,
                 start_time AS "startTime", end_time AS "endTime",
                 return_date::text AS "returnDate", location,
                 contact_phone AS "contactPhone"`,
      [
        req.user.id, type, start, end, days, reason || null,
        startTime || null, endTime || null, returnDate || null,
        location || null, contactPhone || null,
      ]
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
const DIST_CANDIDATES = [
  path.join(__dirname, "frontend", "dist"),       // backend/frontend/dist (Docker kopyası)
  path.join(__dirname, "..", "frontend", "dist"), // ../frontend/dist (Render/monorepo)
];
const FRONTEND_DIST =
  DIST_CANDIDATES.find((p) => fs.existsSync(path.join(p, "index.html"))) || DIST_CANDIDATES[0];
const INDEX_HTML = path.join(FRONTEND_DIST, "index.html");
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Bulunamadı." });
  }
  if (fs.existsSync(INDEX_HTML)) {
    return res.sendFile(INDEX_HTML);
  }
  res
    .status(200)
    .send("Backend çalışıyor. Geliştirme için frontend'i Vite ile açın (npm run dev → http://localhost:5173).");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`İzin uygulaması API ${PORT} portunda çalışıyor`);
});
