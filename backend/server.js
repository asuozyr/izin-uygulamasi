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
const nodemailer = require("nodemailer");

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
// E-posta (SMTP) — opsiyonel. Env tanımlıysa gönderir, değilse sessizce atlar.
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, APP_URL
// ---------------------------------------------------------------------
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || "SmartAlpha İzin <noreply@smartalpha.dev>";
const APP_URL = process.env.APP_URL || "https://leaves.smartalpha.dev";
let mailTransport = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: parseInt(process.env.SMTP_PORT || "465", 10) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  console.log("E-posta gönderimi etkin (SMTP yapılandırıldı).");
} else {
  console.log("E-posta gönderimi devre dışı (SMTP env yok). Uygulama içi bildirimler çalışır.");
}
async function sendMail(to, subject, html) {
  if (!mailTransport || !to) return;
  try {
    await mailTransport.sendMail({ from: MAIL_FROM, to, subject, html });
  } catch (err) {
    console.error("E-posta gönderilemedi:", err.message);
  }
}

// Marka kimliğine uygun HTML e-posta şablonu
const BRAND_PURPLE = "#6F03B5";
function leaveEmailHtml({ heading, statusLabel, statusColor, employeeName, typeLabel, dateRange, daysText, reason, note }) {
  const row = (k, v) => v
    ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px">${k}</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500">${v}</td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="text-align:center;padding:8px 0 16px">
      <span style="font-size:26px;font-weight:800;color:#111827;letter-spacing:-.5px">Smart<span style="color:${BRAND_PURPLE};font-style:italic">α</span></span>
    </div>
    <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="background:${BRAND_PURPLE};padding:18px 24px">
        <div style="color:#fff;font-size:17px;font-weight:600">${heading}</div>
      </div>
      <div style="padding:22px 24px">
        ${statusLabel ? `<div style="display:inline-block;padding:4px 12px;border-radius:999px;background:${statusColor}1a;color:${statusColor};font-size:13px;font-weight:600;margin-bottom:14px">${statusLabel}</div>` : ""}
        <table style="width:100%;border-collapse:collapse">
          ${row("Çalışan", employeeName)}
          ${row("İzin türü", typeLabel)}
          ${row("Tarih aralığı", dateRange)}
          ${row("Toplam", daysText)}
          ${row("Açıklama", reason)}
        </table>
        ${note ? `<p style="margin:16px 0 0;color:#374151;font-size:14px;line-height:1.5">${note}</p>` : ""}
        <div style="margin-top:22px">
          <a href="${APP_URL}" style="display:inline-block;background:${BRAND_PURPLE};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px">Uygulamayı aç</a>
        </div>
      </div>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0 0">Smart Alfa Teknoloji San. ve Tic. A.Ş. — İzin Yönetim Sistemi</p>
  </div></body></html>`;
}

// Etiketler
const TYPE_LABELS = { yillik: "Yıllık izin", mazeret: "Mazeret izni", hastalik: "Hastalık izni", ucretsiz: "Ücretsiz izin" };
const STATUS_META = {
  beklemede: { label: "Beklemede", color: "#b45309" },
  onaylandi: { label: "Onaylandı", color: "#15803d" },
  reddedildi: { label: "Reddedildi", color: "#b91c1c" },
  iptal: { label: "İptal edildi", color: "#6b7280" },
};
function fmtTR(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ""));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(d || "");
}
function dateRangeText(start, end) {
  return start === end ? fmtTR(start) : `${fmtTR(start)} – ${fmtTR(end)}`;
}

// Bildirim oluştur (uygulama içi) + ilgili kullanıcıya e-posta (varsa). Yanıtı bloklamaz.
async function createNotification({ userId, type, title, body, requestId, email, emailSubject, emailHtml }) {
  try {
    await pool.query(
      "INSERT INTO notifications (user_id, type, title, body, request_id) VALUES ($1,$2,$3,$4,$5)",
      [userId, type, title, body || null, requestId || null]
    );
  } catch (err) {
    console.error("Bildirim oluşturulamadı:", err.message);
  }
  if (email && emailSubject && emailHtml) {
    sendMail(email, emailSubject, emailHtml); // await yok: yanıtı geciktirmesin
  }
}

// Olay yardımcıları --------------------------------------------------
async function notifyManagersNewRequest(r) {
  const { rows: emp } = await pool.query("SELECT name FROM employees WHERE id=$1", [r.userId]);
  const empName = emp[0]?.name || "Çalışan";
  const { rows: mgrs } = await pool.query("SELECT id, email FROM employees WHERE role='yonetici'");
  const typeLabel = TYPE_LABELS[r.type] || r.type;
  const range = dateRangeText(r.start, r.end);
  const daysText = `${r.days} gün`;
  const html = leaveEmailHtml({
    heading: "Yeni izin talebi", statusLabel: "Beklemede", statusColor: STATUS_META.beklemede.color,
    employeeName: empName, typeLabel, dateRange: range, daysText, reason: r.reason,
    note: `${empName} yeni bir izin talebi oluşturdu ve onayınızı bekliyor.`,
  });
  for (const m of mgrs) {
    await createNotification({
      userId: m.id, type: "request_created", title: "Yeni izin talebi",
      body: `${empName} • ${typeLabel} • ${range} (${daysText})`, requestId: r.id,
      email: m.email, emailSubject: `Yeni izin talebi — ${empName}`, emailHtml: html,
    });
  }
}
async function notifyEmployeeStatus(r, kind) {
  // kind: 'admin_created' | 'request_approved' | 'request_rejected' | 'admin_updated' | 'admin_cancelled'
  const { rows: emp } = await pool.query("SELECT name, email FROM employees WHERE id=$1", [r.userId]);
  if (!emp.length) return;
  const empName = emp[0].name, email = emp[0].email;
  const typeLabel = TYPE_LABELS[r.type] || r.type;
  const range = dateRangeText(r.start, r.end);
  const daysText = `${r.days} gün`;
  const MAP = {
    admin_created:    { title: "Adınıza izin kaydı oluşturuldu", st: "onaylandi", note: "Yöneticiniz adınıza bir izin kaydı oluşturdu." },
    request_approved: { title: "İzin talebiniz onaylandı",        st: "onaylandi", note: "İzin talebiniz yöneticiniz tarafından onaylandı." },
    request_rejected: { title: "İzin talebiniz reddedildi",        st: "reddedildi", note: "İzin talebiniz yöneticiniz tarafından reddedildi." },
    admin_updated:    { title: "İzin kaydınız güncellendi",        st: r.status, note: "Yöneticiniz izin kaydınızı güncelledi." },
    admin_cancelled:  { title: "İzin kaydınız iptal edildi",       st: "iptal", note: "Yöneticiniz izin kaydınızı iptal etti." },
  };
  const meta = MAP[kind];
  const sm = STATUS_META[meta.st] || STATUS_META.beklemede;
  const html = leaveEmailHtml({
    heading: meta.title, statusLabel: sm.label, statusColor: sm.color,
    employeeName: empName, typeLabel, dateRange: range, daysText, reason: r.reason, note: meta.note,
  });
  await createNotification({
    userId: r.userId, type: kind, title: meta.title,
    body: `${typeLabel} • ${range} (${daysText})`, requestId: r.id,
    email, emailSubject: meta.title, emailHtml: html,
  });
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
const VALID_STATUSES = ["beklemede", "onaylandi", "reddedildi", "iptal"];

// Pastel çalışan renk paleti — employee_color yoksa id'den deterministik üretilir (tutarlı).
const EMPLOYEE_COLORS = [
  "#DCE7FB", "#FBE2E6", "#E3F3DD", "#FBEFD6", "#E9E0FB", "#D7F0EF",
  "#FBE6F2", "#E8EAD6", "#F8E2D0", "#DDEBF6", "#EADFD2", "#E0E7E9",
];
function colorForId(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return EMPLOYEE_COLORS[h % EMPLOYEE_COLORS.length];
}

const DAY_TYPES = ["full_day", "half_day", "custom"];
const round1 = (n) => Math.round(n * 10) / 10;
function timeToMin(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}
function hoursBetween(startTime, endTime) {
  const s = timeToMin(startTime);
  const e = timeToMin(endTime);
  if (s == null || e == null || e <= s) return 0;
  return (e - s) / 60;
}

// Resmi tatiller (genişletilebilir): "YYYY-MM-DD" formatında. İş gününe sayılmaz.
// İleride buraya tarih eklenince (örn. "2026-04-23") otomatik olarak izinden düşülür.
const HOLIDAYS = new Set([
  // "2026-01-01", "2026-04-23", "2026-05-01", "2026-05-19", "2026-07-15",
  // "2026-08-30", "2026-10-29",
]);
function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; // yerel gün başı (UTC kayması olmadan)
}
function ymd(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}
// Hafta sonu (Cmt/Paz) ve resmi tatil değilse iş günüdür.
function isBusinessDay(d) {
  const wd = d.getDay(); // 0=Pazar, 6=Cumartesi
  if (wd === 0 || wd === 6) return false;
  if (HOLIDAYS.has(ymd(d))) return false;
  return true;
}
// start..end (dahil) aralığındaki iş günü sayısı.
function businessDaysBetween(start, end) {
  const s = parseYmd(start);
  const e = parseYmd(end);
  if (!s || !e || e < s) return 0;
  let count = 0;
  const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  while (cur <= e) {
    if (isBusinessDay(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
// Sınır gün kesri: çalışılmayan süre 0; 0–4 saat arası 0,5; 4 saat ve üzeri 1 tam gün.
function boundaryDayFraction(hours) {
  if (hours <= 0) return 0;
  return hours < 4 ? 0.5 : 1;
}
// Çok günlük "kendim gireceğim" (saatli) izin:
//  - ilk gün: başlangıç saatinden mesai bitimine (18:00) kadar
//  - son gün: mesai başlangıcından (09:00) bitiş/dönüş saatine kadar
//  - aradaki tam günler: her biri 1
//  - hafta sonu ve resmi tatiller hiçbir konumda sayılmaz
function customMultiDayValue(start, end, startTime, endTime) {
  const first = parseYmd(start);
  const last = parseYmd(end);
  if (!first || !last || last <= first) return 0;
  const sm = timeToMin(startTime);
  const em = timeToMin(endTime);
  const firstHours = sm == null ? FULL_WORKDAY_HOURS
    : (WORK_END_MIN - Math.min(Math.max(sm, WORK_START_MIN), WORK_END_MIN)) / 60;
  const lastHours = em == null ? FULL_WORKDAY_HOURS
    : (Math.max(Math.min(em, WORK_END_MIN), WORK_START_MIN) - WORK_START_MIN) / 60;

  let total = 0;
  if (isBusinessDay(first)) total += boundaryDayFraction(firstHours);
  if (isBusinessDay(last)) total += boundaryDayFraction(lastHours);
  // Aradaki günler (ilk+1 .. son-1)
  const cur = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1);
  const stop = new Date(last.getFullYear(), last.getMonth(), last.getDate() - 1);
  while (cur <= stop) {
    if (isBusinessDay(cur)) total += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return total;
}
// Gün tipine göre toplam izin günü:
//  full_day -> aralıktaki her gün 1
//  half_day -> her gün 0,5
//  custom   -> tek gün: (bitiş-başlangıç)/9; çok gün: başlangıç günü "başlangıç saati"nden,
//              dönüş günü "bitiş saati"ne kadar (her biri en yakın 0,5), aradaki günler tam.
const FULL_WORKDAY_HOURS = 9;
const CUSTOM_MIN_HOURS = 2;
const CUSTOM_MIN_MSG = "Girilen izin süresi 2 saatten az olamaz. Lütfen yöneticinizle görüşünüz.";
const WORK_START_MIN = 9 * 60; // 09:00
const WORK_END_MIN = 18 * 60; // 18:00
const r05 = (n) => Math.round(n * 2) / 2;
const clamp01 = (n) => Math.min(1, Math.max(0, n));
function computeDays(dayType, start, end, startTime, endTime) {
  if (dayType === "half_day") return 0.5;
  if (dayType === "custom") {
    // Tek gün (saatli): saat farkına göre 0,5 / 1; 2 saatten azı geçersiz (0).
    if (start === end) {
      const h = hoursBetween(startTime, endTime);
      if (h < CUSTOM_MIN_HOURS) return 0;
      return h < 4 ? 0.5 : 1;
    }
    // Çok günlük "kendim gireceğim": ilk/son gün saatlere göre, aradakiler tam gün.
    return customMultiDayValue(start, end, startTime, endTime);
  }
  // full_day: yalnızca iş günleri (Pzt–Cuma), hafta sonu ve resmi tatiller düşülür.
  return businessDaysBetween(start, end);
}

// Yer/telefon/saat alanlarını gün tipine ve "kayıtlı bilgimi kullan" seçeneklerine göre çöz.
function resolveFormFields(body, dur) {
  const useRes = !!body.useResidenceCity;
  const usePhone = !!body.useExistingPhone;
  const isCustom = dur === "custom";
  return {
    useRes,
    usePhone,
    location: useRes ? "İkamet şehrim" : (body.location || null),
    contactPhone: usePhone ? "Mevcut cep telefonum" : (body.contactPhone || null),
    startTime: isCustom ? (body.startTime || null) : null,
    endTime: isCustom ? (body.endTime || null) : null,
  };
}

// Yıllık izin hakediş hesabı:
//  - çalışılan her tam ay için 1.25 gün
//  - tamamlanan her hizmet yılı için ek 1 gün
// hire_date'e göre, bugünün tarihine kadar otomatik (canlı/günlük) hesaplanır.
function computeEarnedLeave(hireDate, asOf = new Date()) {
  if (!hireDate) return 0;
  const hire = new Date(hireDate);
  if (isNaN(hire.getTime())) return 0;
  let months = (asOf.getFullYear() - hire.getFullYear()) * 12 + (asOf.getMonth() - hire.getMonth());
  if (asOf.getDate() < hire.getDate()) months -= 1;
  let years = asOf.getFullYear() - hire.getFullYear();
  const anniv = new Date(asOf.getFullYear(), hire.getMonth(), hire.getDate());
  if (asOf < anniv) years -= 1;
  months = Math.max(0, months);
  years = Math.max(0, years);
  const earned = months * 1.25 + years * 1;
  return Math.round(earned * 100) / 100;
}

// Bir kullanıcının ONAYLANMIŞ yıllık izin gün toplamı (kullanılan izin)
async function usedAnnualDays(userId) {
  const { rows } = await pool.query(
    "SELECT COALESCE(SUM(days),0) AS used FROM leave_requests WHERE user_id = $1 AND type = 'yillik' AND status = 'onaylandi'",
    [userId]
  );
  return Number(rows[0].used) || 0;
}

function publicUser(row, usedDays = 0) {
  const totalEarned = computeEarnedLeave(row.hire_date);
  const used = Number(usedDays) || 0;
  const remaining = Math.round((totalEarned - used) * 100) / 100;
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    role: row.role,
    email: row.email,
    avatarUrl: row.avatar_url || null,
    hireDate: row.hire_date ? new Date(row.hire_date).toISOString().slice(0, 10) : null,
    totalEarned,
    usedLeave: used,
    remainingLeave: remaining,
    employeeColor: row.employee_color || colorForId(row.id),
    balance: totalEarned, // geriye dönük uyumluluk (eski "Yıllık hak" alanı)
  };
}

// Ad soyaddan baş harfler üretir (ör. "Ayşe Kaya" -> "AK").
function initialsFromName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// İsim eşleştirme anahtarı: Türkçe karakterleri ASCII'ye katlar, büyük harfe çevirir,
// fazla boşlukları sadeleştirir. SQL tarafındaki
// upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) ile birebir aynı sonucu üretir.
const TR_FOLD = { ç:"c", Ç:"C", ğ:"g", Ğ:"G", ı:"i", İ:"I", ö:"o", Ö:"O", ş:"s", Ş:"S", ü:"u", Ü:"U" };
function normNameKey(s) {
  return String(s || "")
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => TR_FOLD[c])
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
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

    // 3) Hâlâ yoksa, Google'a bağlı OLMAYAN bir kaydı ad ile eşle (seed/manuel kaydı bağla).
    //    Türkçe karakter farkları (I/ı, İ/i, ş, ğ ...) eşleşmeyi bozmasın diye normalize edilir.
    if (!employee) {
      ({ rows } = await pool.query(
        `SELECT id, role FROM employees
         WHERE google_id IS NULL
           AND upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = $1
         LIMIT 1`,
        [normNameKey(name)]
      ));
      employee = rows[0];
      if (employee) {
        // Admin daha önce bir e-posta tanımladıysa onu koru; yoksa Google e-postasını yaz.
        await pool.query(
          "UPDATE employees SET google_id = $1, email = COALESCE(email, $2), avatar_url = $3, initials = $4 WHERE id = $5",
          [googleId, email, avatar, initials, employee.id]
        );
      }
    }

    // 4) Hâlâ yoksa yeni çalışan kaydı oluştur (JIT). Yeni çalışan bugünden itibaren hak eder.
    if (!employee) {
      const role = wantsAdmin ? "yonetici" : "calisan";
      ({ rows } = await pool.query(
        `INSERT INTO employees (id, name, initials, balance, role, email, google_id, avatar_url, hire_date, employee_color)
         VALUES ($1, $2, $3, 14, $4, $5, $6, $7, CURRENT_DATE, $8)
         RETURNING id, role`,
        [googleId, name, initials, role, email, googleId, avatar, colorForId(googleId)]
      ));
      employee = rows[0];
    } else if (wantsAdmin && employee.role !== "yonetici") {
      // Admin e-postasıysa rolü yükselt
      await pool.query("UPDATE employees SET role = 'yonetici' WHERE id = $1", [employee.id]);
      employee.role = "yonetici";
    }

    // Güncel tam kaydı çek
    const { rows: finalRows } = await pool.query(
      "SELECT id, name, initials, balance, role, email, avatar_url, hire_date, employee_color FROM employees WHERE id = $1",
      [employee.id]
    );
    const full = finalRows[0];
    const used = await usedAnnualDays(full.id);

    // Oturumun açık kalması için 7 günlük JWT
    const token = jwt.sign({ id: full.id, role: full.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: publicUser(full, used) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Giriş yapılamadı." });
  }
});

// GET /api/me
app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, initials, balance, role, email, avatar_url, hire_date, employee_color FROM employees WHERE id = $1",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    const used = await usedAnnualDays(rows[0].id);
    res.json(publicUser(rows[0], used));
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
      "SELECT id, name, initials, balance, role, email, avatar_url, hire_date, employee_color FROM employees ORDER BY name"
    );
    const { rows: usedRows } = await pool.query(
      "SELECT user_id, COALESCE(SUM(days),0) AS used FROM leave_requests WHERE type = 'yillik' AND status = 'onaylandi' GROUP BY user_id"
    );
    const usedMap = {};
    for (const u of usedRows) usedMap[u.user_id] = Number(u.used) || 0;
    res.json(rows.map((r) => publicUser(r, usedMap[r.id] || 0)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Çalışanlar getirilemedi." });
  }
});

// PATCH /api/employees/:id/email  -> yönetici bir çalışana e-posta tanımlar/günceller.
// Bu e-posta Google hesabıyla eşleştiğinde kullanıcı aynı çalışana bağlanır (yeni kayıt açılmaz).
app.patch("/api/employees/:id/email", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let email = (req.body && req.body.email ? String(req.body.email) : "").trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Geçerli bir e-posta adresi girin." });
    }
    // Aynı e-posta başka bir çalışanda olmasın (ikinci kayıt / çakışma engeli)
    if (email) {
      const { rows: dup } = await pool.query(
        "SELECT id FROM employees WHERE email = $1 AND id <> $2",
        [email, id]
      );
      if (dup.length) {
        return res.status(409).json({ error: "Bu e-posta zaten başka bir çalışana tanımlı." });
      }
    }
    const { rows } = await pool.query(
      `UPDATE employees SET email = $1 WHERE id = $2
       RETURNING id, name, initials, balance, role, email, avatar_url, hire_date, employee_color`,
      [email || null, id]
    );
    if (!rows.length) return res.status(404).json({ error: "Çalışan bulunamadı." });
    const used = await usedAnnualDays(rows[0].id);
    res.json(publicUser(rows[0], used));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "E-posta güncellenemedi." });
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
             days::float AS days, reason, status,
             duration_type AS "durationType",
             start_time AS "startTime", end_time AS "endTime",
             return_date::text AS "returnDate", location,
             contact_phone AS "contactPhone",
             use_residence_city AS "useResidenceCity", use_existing_phone AS "useExistingPhone"
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
    const { type, start, end, reason, returnDate, durationType } = req.body;
    const dur = DAY_TYPES.includes(durationType) ? durationType : "full_day";

    if (!type || !start || !end) {
      return res.status(400).json({ error: "Eksik alanlar var." });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Geçersiz izin türü." });
    }
    if (new Date(end) < new Date(start)) {
      return res.status(400).json({ error: "Bitiş tarihi başlangıçtan önce olamaz." });
    }
    const f = resolveFormFields(req.body, dur);
    if (dur === "custom" && (!f.startTime || !f.endTime)) {
      return res.status(400).json({ error: "Saat girişi için başlangıç ve bitiş saati zorunludur." });
    }
    if (dur === "custom" && start === end && hoursBetween(f.startTime, f.endTime) < CUSTOM_MIN_HOURS) {
      return res.status(400).json({ error: CUSTOM_MIN_MSG });
    }

    const days = computeDays(dur, start, end, f.startTime, f.endTime);

    // Not: Kalan yıllık izin bakiyesi yetersiz olsa bile talep oluşturulur.

    const { rows } = await pool.query(
      `INSERT INTO leave_requests
         (user_id, type, start_date, end_date, days, reason, start_time, end_time, return_date, location, contact_phone, status, duration_type, use_residence_city, use_existing_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'beklemede', $12, $13, $14)
       RETURNING id, user_id AS "userId", type,
                 start_date::text AS "start",
                 end_date::text AS "end",
                 days::float AS days, reason, status, duration_type AS "durationType",
                 start_time AS "startTime", end_time AS "endTime",
                 return_date::text AS "returnDate", location,
                 contact_phone AS "contactPhone",
                 use_residence_city AS "useResidenceCity", use_existing_phone AS "useExistingPhone"`,
      [
        req.user.id, type, start, end, days, reason || null,
        f.startTime, f.endTime, returnDate || null,
        f.location, f.contactPhone, dur, f.useRes, f.usePhone,
      ]
    );

    await notifyManagersNewRequest(rows[0]).catch((e) => console.error("bildirim:", e.message));
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Talep oluşturulamadı." });
  }
});

// POST /api/admin/requests  (yalnızca yönetici)
// Yönetici bir çalışan adına izin kaydı oluşturur; otomatik "onaylandi" olur.
// body: { userId, type, start, end, returnDate, startTime?, endTime?, location?, contactPhone?, reason? }
app.post("/api/admin/requests", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, type, start, end, reason, returnDate, durationType } = req.body;
    const dur = DAY_TYPES.includes(durationType) ? durationType : "full_day";

    if (!userId || !type || !start || !end || !returnDate) {
      return res.status(400).json({ error: "Eksik alanlar var (çalışan, izin türü, başlangıç, bitiş ve işe dönüş tarihi zorunlu)." });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Geçersiz izin türü." });
    }
    if (new Date(end) < new Date(start)) {
      return res.status(400).json({ error: "Bitiş tarihi başlangıçtan önce olamaz." });
    }

    const { rows: empRows } = await pool.query("SELECT id FROM employees WHERE id = $1", [userId]);
    if (empRows.length === 0) {
      return res.status(404).json({ error: "Çalışan bulunamadı." });
    }

    const f = resolveFormFields(req.body, dur);
    if (dur === "custom" && (!f.startTime || !f.endTime)) {
      return res.status(400).json({ error: "Saat girişi için başlangıç ve bitiş saati zorunludur." });
    }
    if (dur === "custom" && start === end && hoursBetween(f.startTime, f.endTime) < CUSTOM_MIN_HOURS) {
      return res.status(400).json({ error: CUSTOM_MIN_MSG });
    }

    const days = computeDays(dur, start, end, f.startTime, f.endTime);

    const { rows } = await pool.query(
      `INSERT INTO leave_requests
         (user_id, type, start_date, end_date, days, reason, start_time, end_time, return_date, location, contact_phone, status, source, created_by_admin_id, duration_type, use_residence_city, use_existing_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'onaylandi', 'admin_created', $12, $13, $14, $15)
       RETURNING id, user_id AS "userId", type,
                 start_date::text AS "start",
                 end_date::text AS "end",
                 days::float AS days, reason, status, duration_type AS "durationType",
                 start_time AS "startTime", end_time AS "endTime",
                 return_date::text AS "returnDate", location,
                 contact_phone AS "contactPhone",
                 use_residence_city AS "useResidenceCity", use_existing_phone AS "useExistingPhone"`,
      [
        userId, type, start, end, days, reason || null,
        f.startTime, f.endTime, returnDate || null,
        f.location, f.contactPhone, req.user.id, dur, f.useRes, f.usePhone,
      ]
    );

    await notifyEmployeeStatus(rows[0], "admin_created").catch((e) => console.error("bildirim:", e.message));
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Kayıt oluşturulamadı." });
  }
});

// PUT /api/leave-requests/:id  — talebi düzenle
// - Çalışan yalnız kendi "beklemede" talebini; yönetici tüm talepleri düzenleyebilir.
app.put("/api/leave-requests/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { rows: existing } = await pool.query(
      "SELECT user_id, status FROM leave_requests WHERE id = $1",
      [id]
    );
    if (existing.length === 0) return res.status(404).json({ error: "Talep bulunamadı." });

    const isAdmin = req.user.role === "yonetici";
    if (!isAdmin) {
      if (existing[0].user_id !== req.user.id) {
        return res.status(403).json({ error: "Bu talebi düzenleme yetkiniz yok." });
      }
      if (existing[0].status !== "beklemede") {
        return res.status(403).json({ error: "Yalnızca beklemede olan talepler düzenlenebilir." });
      }
    }

    const { type, start, end, reason, returnDate, durationType } = req.body;
    const dur = DAY_TYPES.includes(durationType) ? durationType : "full_day";

    if (!type || !start || !end) {
      return res.status(400).json({ error: "Eksik alanlar var." });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Geçersiz izin türü." });
    }
    if (new Date(end) < new Date(start)) {
      return res.status(400).json({ error: "Bitiş tarihi başlangıçtan önce olamaz." });
    }
    const f = resolveFormFields(req.body, dur);
    if (dur === "custom" && (!f.startTime || !f.endTime)) {
      return res.status(400).json({ error: "Saat girişi için başlangıç ve bitiş saati zorunludur." });
    }
    if (dur === "custom" && start === end && hoursBetween(f.startTime, f.endTime) < CUSTOM_MIN_HOURS) {
      return res.status(400).json({ error: CUSTOM_MIN_MSG });
    }

    const days = computeDays(dur, start, end, f.startTime, f.endTime);

    const { rows } = await pool.query(
      `UPDATE leave_requests SET
         type = $1, start_date = $2, end_date = $3, days = $4, reason = $5,
         start_time = $6, end_time = $7, return_date = $8, location = $9, contact_phone = $10,
         duration_type = $11, use_residence_city = $12, use_existing_phone = $13, updated_at = now()
       WHERE id = $14
       RETURNING id, user_id AS "userId", type,
                 start_date::text AS "start", end_date::text AS "end",
                 days::float AS days, reason, status, duration_type AS "durationType",
                 start_time AS "startTime", end_time AS "endTime",
                 return_date::text AS "returnDate", location, contact_phone AS "contactPhone",
                 use_residence_city AS "useResidenceCity", use_existing_phone AS "useExistingPhone"`,
      [
        type, start, end, days, reason || null,
        f.startTime, f.endTime, returnDate || null,
        f.location, f.contactPhone, dur, f.useRes, f.usePhone, id,
      ]
    );

    // Yönetici, başka bir çalışanın talebini düzenlediyse o çalışana bildir
    if (isAdmin && existing[0].user_id !== req.user.id) {
      await notifyEmployeeStatus(rows[0], "admin_updated").catch((e) => console.error("bildirim:", e.message));
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Talep güncellenemedi." });
  }
});

// GET /api/leave-requests/:id — tek talep (yazdırma formu için). Çalışan yalnız kendi; yönetici tümü.
app.get("/api/leave-requests/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT lr.id, lr.user_id AS "userId", lr.type,
              lr.start_date::text AS "start", lr.end_date::text AS "end",
              lr.days::float AS days, lr.reason, lr.status, lr.duration_type AS "durationType",
              lr.start_time AS "startTime", lr.end_time AS "endTime",
              lr.return_date::text AS "returnDate", lr.location,
              lr.contact_phone AS "contactPhone",
              lr.use_residence_city AS "useResidenceCity", lr.use_existing_phone AS "useExistingPhone",
              lr.created_at AS "createdAt",
              e.name AS "employeeName", e.initials AS "employeeInitials"
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.user_id
       WHERE lr.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Talep bulunamadı." });
    const row = rows[0];
    if (req.user.role !== "yonetici" && row.userId !== req.user.id) {
      return res.status(403).json({ error: "Bu talebi görüntüleme yetkiniz yok." });
    }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Talep getirilemedi." });
  }
});

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

    // Durumu değiştiren kişi talebin sahibi değilse (yani yönetici işlemiyse) çalışana bildir
    const updated = rows[0];
    if (updated.userId !== req.user.id) {
      const kind = updated.status === "onaylandi" ? "request_approved"
        : updated.status === "reddedildi" ? "request_rejected"
        : updated.status === "iptal" ? "admin_cancelled" : null;
      if (kind) {
        const norm = {
          ...updated,
          start: updated.start, end: updated.end, days: updated.days,
        };
        await notifyEmployeeStatus(norm, kind).catch((e) => console.error("bildirim:", e.message));
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Talep güncellenemedi." });
  }
});

// ---------------------------------------------------------------------
// Bildirimler
// ---------------------------------------------------------------------
// GET /api/notifications -> { items, unread }
app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, type, title, body, request_id AS "requestId", read,
              created_at AS "createdAt"
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unread = rows.reduce((n, r) => n + (r.read ? 0 : 1), 0);
    res.json({ items: rows, unread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Bildirimler getirilemedi." });
  }
});

// PATCH /api/notifications/:id/read
app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Bildirim güncellenemedi." });
  }
});

// POST /api/notifications/read-all
app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET read = true WHERE user_id = $1 AND read = false", [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Bildirimler güncellenemedi." });
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
              lr.duration_type AS "durationType", lr.start_time AS "startTime", lr.end_time AS "endTime",
              e.id AS "empId", e.name, e.initials, e.employee_color AS "color"
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
      const entry = {
        name: row.name,
        initials: row.initials,
        type: row.type,
        durationType: row.durationType || "full_day",
        startTime: row.startTime || null,
        endTime: row.endTime || null,
        color: row.color || colorForId(row.empId),
      };
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = String(d.getDate());
        if (!result[day]) result[day] = [];
        result[day].push(entry);
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
