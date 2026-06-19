import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import logo from "./assets/logo.png";

const API_BASE = "";

// Brand color palette (purple)
const BRAND = {
  primary: "#6B21A8",      // main purple
  primaryHover: "#581C87", // darker on hover
  light: "#F3E8FF",        // light purple background
  text: "#3B0764",         // deep purple for text accents
};

const LEAVE_TYPES = {
  yillik: { label: "Yıllık izin", color: "c-blue" },
  mazeret: { label: "Mazeret izni", color: "c-amber" },
  hastalik: { label: "Hastalık izni", color: "c-coral" },
  ucretsiz: { label: "Ücretsiz izin", color: "c-gray" },
};

const STATUS = {
  beklemede: { label: "Beklemede", color: "c-amber" },
  onaylandi: { label: "Onaylandı", color: "c-green" },
  reddedildi: { label: "Reddedildi", color: "c-red" },
};

const RAMP_COLORS = {
  "c-blue": { bg: "#E6F1FB", fg: "#0C447C" },
  "c-amber": { bg: "#FAEEDA", fg: "#854F0B" },
  "c-coral": { bg: "#FAECE7", fg: "#993C1D" },
  "c-gray": { bg: "#F1EFE8", fg: "#444441" },
  "c-green": { bg: "#EAF3DE", fg: "#27500A" },
  "c-red": { bg: "#FCEBEB", fg: "#791F1F" },
};

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function diffDays(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const d = Math.round((e - s) / 86400000) + 1;
  return d > 0 ? d : 1;
}

function formatDate(isoDate) {
  // Accepts "YYYY-MM-DD" (or a date-time string) and returns "GG.AA.YYYY"
  const datePart = String(isoDate).slice(0, 10);
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return datePart;
  return `${d}.${m}.${y}`;
}

function ColorBadge({ text, ramp }) {
  const c = RAMP_COLORS[ramp];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "var(--border-radius-md)",
      fontSize: "12px",
      fontWeight: 500,
      background: c.bg,
      color: c.fg,
    }}>
      {text}
    </span>
  );
}

// Profil fotoğrafı (yoksa baş harfler)
function Avatar({ user, size = 36 }) {
  const [imgError, setImgError] = useState(false);
  if (user?.avatarUrl && !imgError) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: BRAND.light, color: BRAND.primary,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 600, fontSize: Math.round(size * 0.36), flexShrink: 0,
    }}>
      {user?.initials || "?"}
    </div>
  );
}

// ---------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------
async function apiRequest(path, options = {}, token) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch (_) {}
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  loginWithGoogle: (credential) =>
    apiRequest("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) }),
  getMe: (token) => apiRequest("/api/me", {}, token),
  getEmployees: (token) => apiRequest("/api/employees", {}, token),
  getRequests: (token, userId) =>
    apiRequest(`/api/requests${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`, {}, token),
  createRequest: (token, payload) =>
    apiRequest("/api/requests", { method: "POST", body: JSON.stringify(payload) }, token),
  updateRequestStatus: (token, id, status) =>
    apiRequest(`/api/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token),
  getCalendar: (token, year, month) => apiRequest(`/api/calendar?year=${year}&month=${month}`, {}, token),
};

// =======================================================================
// Login screen
// =======================================================================
// Login ekranı stilleri (yalnızca bu bileşene özel, .la- önekiyle kapsanmıştır).
// Renkler BRAND paletinizden ve mevcut CSS değişkenlerinizden (--accent, --sans vb.) türetilir.
const LOGIN_CSS = `
.la-page * { box-sizing: border-box; }
.la-page {
  position: fixed; inset: 0; overflow-y: auto;
  display: grid; grid-template-columns: 1.05fr 1fr; min-height: 100%;
  text-align: left;
  font-family: var(--sans, system-ui, sans-serif);
  color: var(--color-text-primary, #08060d);
  background: #f5f3ff;
}
/* ---- Sol marka paneli ---- */
.la-brand {
  position: relative; overflow: hidden; padding: 56px 60px;
  display: flex; flex-direction: column;
  background: radial-gradient(120% 90% at 75% 5%, #efeafe 0%, ${BRAND.light} 42%, #ece6fb 100%);
}
.la-rings { position: absolute; top: 4%; right: -6%; width: 620px; height: 620px; pointer-events: none; opacity: .55; }
.la-logo { position: relative; z-index: 2; }
.la-logo img { height: 42px; width: auto; display: block; }
.la-artwork { position: absolute; top: 50%; right: 4%; transform: translateY(-52%); width: 360px; z-index: 1; pointer-events: none; }
.la-wave { position: absolute; left: -40px; bottom: -30px; width: 560px; height: 320px; z-index: 1; opacity: .9; pointer-events: none; }
.la-wave path { fill: none; stroke: var(--accent, #aa3bff); stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 0.1 9; }
.la-copy { position: relative; z-index: 2; margin-top: auto; max-width: 430px; }
.la-copy h1 { font-family: var(--heading, var(--sans)); font-weight: 700; font-size: 46px; line-height: 1.08; letter-spacing: -.02em; margin: 0 0 18px; color: var(--color-text-primary, #08060d); }
.la-copy h1 .hl { color: ${BRAND.primary}; }
.la-copy p { font-size: 17px; line-height: 1.6; color: #5a5570; margin: 0; max-width: 380px; }
.la-note { position: relative; z-index: 2; margin-top: 34px; display: flex; gap: 12px; align-items: flex-start; color: #6f6a86; font-size: 13.5px; line-height: 1.5; max-width: 420px; }
.la-note svg { flex: 0 0 auto; width: 26px; height: 26px; color: ${BRAND.primary}; margin-top: 1px; }
/* ---- Sağ form paneli ---- */
.la-formwrap { display: grid; place-items: center; padding: 40px 28px; }
.la-card { width: 100%; max-width: 440px; background: var(--color-background-primary, #fff); border-radius: 22px; padding: 46px 44px 38px; box-shadow: 0 30px 70px -30px rgba(76,29,117,.28); }
.la-card h2 { font-family: var(--heading, var(--sans)); font-weight: 700; font-size: 30px; letter-spacing: -.02em; margin: 0 0 8px; text-align: center; color: var(--color-text-primary, #08060d); }
.la-sub { margin: 0 0 30px; text-align: center; color: var(--color-text-secondary, #6b6375); font-size: 15.5px; }
.la-field { margin-bottom: 20px; }
.la-field label { display: block; font-weight: 600; font-size: 14.5px; margin-bottom: 8px; color: var(--color-text-primary, #08060d); }
.la-input { position: relative; display: flex; align-items: center; }
.la-input .lead { position: absolute; left: 16px; width: 19px; height: 19px; color: #9aa0ad; pointer-events: none; }
.la-input input { width: 100%; height: 52px; padding: 0 16px 0 46px; border: 1.5px solid var(--color-border-tertiary, #e5e4e7); border-radius: 13px; font-size: 15px; font-family: inherit; color: var(--color-text-primary, #08060d); background: #fcfcff; transition: border-color .15s, box-shadow .15s, background .15s; }
.la-input input::placeholder { color: #aab0bd; }
.la-input input:focus { outline: none; background: #fff; border-color: ${BRAND.primary}; box-shadow: 0 0 0 4px rgba(107,33,168,.15); }
.la-input input.has-toggle { padding-right: 50px; }
.la-toggle { position: absolute; right: 12px; display: grid; place-items: center; width: 34px; height: 34px; border: 0; background: transparent; color: #9aa0ad; cursor: pointer; border-radius: 8px; }
.la-toggle:hover { color: ${BRAND.primary}; }
.la-toggle svg { width: 20px; height: 20px; }
.la-row { display: flex; align-items: center; justify-content: space-between; margin: 6px 0 22px; }
.la-check { display: inline-flex; align-items: center; gap: 10px; font-size: 14.5px; cursor: pointer; user-select: none; color: var(--color-text-primary, #3a3a4a); }
.la-check input { position: absolute; opacity: 0; pointer-events: none; }
.la-box { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid var(--color-border-tertiary, #e5e4e7); display: grid; place-items: center; background: #fff; transition: background .15s, border-color .15s; }
.la-box svg { width: 13px; height: 13px; color: #fff; opacity: 0; transition: opacity .12s; }
.la-check input:checked + .la-box { background: ${BRAND.primary}; border-color: ${BRAND.primary}; }
.la-check input:checked + .la-box svg { opacity: 1; }
.la-check input:focus-visible + .la-box { box-shadow: 0 0 0 4px rgba(107,33,168,.2); }
.la-link { color: ${BRAND.primary}; font-weight: 600; font-size: 14.5px; text-decoration: none; background: none; border: 0; cursor: pointer; padding: 0; font-family: inherit; }
.la-link:hover { text-decoration: underline; }
.la-error { color: var(--color-text-danger, #b42318); font-size: 13.5px; margin: 0 0 14px; }
.la-btn { width: 100%; height: 54px; border: 0; border-radius: 13px; background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryHover}); color: #fff; font-family: inherit; font-weight: 700; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 10px; transition: transform .08s ease, box-shadow .2s ease, filter .15s; box-shadow: 0 14px 26px -12px rgba(88,28,135,.7); }
.la-btn:hover:not(:disabled) { filter: brightness(1.06); }
.la-btn:active:not(:disabled) { transform: translateY(1px); }
.la-btn:disabled { opacity: .7; cursor: default; }
.la-btn svg { width: 19px; height: 19px; transition: transform .15s; }
.la-btn:hover:not(:disabled) svg { transform: translateX(3px); }
.la-div { display: flex; align-items: center; gap: 16px; margin: 24px 0; color: #a7adba; font-size: 14px; }
.la-div::before, .la-div::after { content: ""; height: 1px; flex: 1; background: var(--color-border-tertiary, #e5e4e7); }
.la-ghost { width: 100%; height: 54px; border: 1.5px solid var(--color-border-tertiary, #e5e4e7); border-radius: 13px; background: #fff; color: ${BRAND.primary}; font-family: inherit; font-weight: 600; font-size: 15.5px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 10px; transition: border-color .15s, background .15s; }
.la-ghost:hover { border-color: ${BRAND.light}; background: #faf8ff; }
.la-ghost svg { width: 19px; height: 19px; }
.la-cr { text-align: center; color: #b4b1c2; font-size: 13px; margin: 26px 0 0; }
.la-gbtn { display: flex; justify-content: center; min-height: 44px; margin-top: 4px; }
.la-busy { text-align: center; color: var(--color-text-secondary, #6b6375); font-size: 14px; margin: 12px 0 0; }
.la-mbrand { display: none; }
@media (max-width: 900px) {
  .la-page { grid-template-columns: 1fr; }
  .la-brand { display: none; }
  .la-formwrap { padding: 30px 18px; }
  .la-mbrand { display: flex; justify-content: center; margin-bottom: 22px; }
  .la-mbrand img { height: 34px; }
  .la-card { padding: 36px 26px 30px; box-shadow: 0 18px 50px -28px rgba(76,29,117,.3); }
  .la-card h2 { font-size: 26px; }
}
@media (prefers-reduced-motion: reduce) { .la-page * { transition: none !important; } }
`;

function LoginScreen({ onLogin }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const btnRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Google ID token geri çağrısı -> backend doğrulaması -> oturum
  const handleCredential = useCallback(
    async (response) => {
      setError("");
      setBusy(true);
      try {
        const data = await api.loginWithGoogle(response.credential);
        onLogin(data.token, data.user);
      } catch (err) {
        setError(err.message || "Giriş yapılamadı.");
        setBusy(false);
      }
    },
    [onLogin]
  );

  // Google Identity Services betiğini yükle ve butonu render et.
  // (StrictMode'da efekt iki kez çalışır; betik yüklenene kadar bekleyip
  //  butonu garantili bir şekilde çizmek için poll kullanıyoruz.)
  useEffect(() => {
    if (!clientId) return;
    let done = false;

    function render() {
      const g = window.google;
      if (done || !g || !g.accounts || !g.accounts.id || !btnRef.current) return;
      done = true;
      g.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
      btnRef.current.innerHTML = "";
      g.accounts.id.renderButton(btnRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        logo_alignment: "center",
        locale: "tr",
        width: 320,
      });
      g.accounts.id.prompt(); // tek dokunuşla otomatik giriş istemi
    }

    if (!document.getElementById("gsi-script")) {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.id = "gsi-script";
      document.head.appendChild(s);
    }

    render(); // hazırsa hemen
    const timer = setInterval(() => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        render();
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [clientId, handleCredential]);

  return (
    <div className="la-page">
      <style>{LOGIN_CSS}</style>

      {/* ===================== Sol marka paneli ===================== */}
      <section className="la-brand">
        <svg className="la-rings" viewBox="0 0 600 600" fill="none" aria-hidden="true">
          <g stroke="#c9bdf0" strokeWidth="1">
            <circle cx="300" cy="300" r="90" />
            <circle cx="300" cy="300" r="150" strokeOpacity=".8" />
            <circle cx="300" cy="300" r="215" strokeOpacity=".6" />
            <circle cx="300" cy="300" r="285" strokeOpacity=".42" />
            <circle cx="300" cy="300" r="360" strokeOpacity=".28" />
          </g>
        </svg>

        <div className="la-logo">
          <img src={logo} alt="SmartAlpha" />
        </div>

        {/* Onaylı izin gününü gösteren takvim görseli */}
        <svg className="la-artwork" viewBox="0 0 320 320" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="laCal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
              <stop offset="1" stopColor="#efeafe" stopOpacity=".9" />
            </linearGradient>
          </defs>
          <rect x="58" y="70" width="204" height="190" rx="22" fill="url(#laCal)" stroke="#d6cdf2" strokeWidth="1.5" />
          <rect x="58" y="70" width="204" height="46" rx="22" fill="#cdbef4" fillOpacity=".55" />
          <rect x="92" y="58" width="10" height="28" rx="5" fill="#b9a7ee" />
          <rect x="218" y="58" width="10" height="28" rx="5" fill="#b9a7ee" />
          <g fill="#c7bbeb">
            <circle cx="92" cy="146" r="6" /><circle cx="126" cy="146" r="6" /><circle cx="160" cy="146" r="6" /><circle cx="194" cy="146" r="6" /><circle cx="228" cy="146" r="6" />
            <circle cx="92" cy="184" r="6" /><circle cx="126" cy="184" r="6" /><circle cx="194" cy="184" r="6" /><circle cx="228" cy="184" r="6" />
            <circle cx="92" cy="222" r="6" /><circle cx="126" cy="222" r="6" /><circle cx="160" cy="222" r="6" /><circle cx="194" cy="222" r="6" /><circle cx="228" cy="222" r="6" />
          </g>
          <circle cx="160" cy="184" r="17" fill={BRAND.primary} />
          <path d="M152 184 l5 5 l11 -11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <g transform="translate(232 96)">
            <circle r="22" fill="#fff" stroke="#ddd6fe" strokeWidth="1.5" />
            <path d="M-8 0 l5 6 l11 -13" stroke={BRAND.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        </svg>

        <svg className="la-wave" viewBox="0 0 560 320" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 250 C120 200 240 300 360 240 S540 180 560 220" opacity=".95" />
          <path d="M0 268 C120 220 240 314 360 256 S540 200 560 238" opacity=".75" />
          <path d="M0 286 C120 240 240 326 360 272 S540 222 560 256" opacity=".55" />
          <path d="M0 304 C120 262 240 336 360 290 S540 244 560 274" opacity=".4" />
          <path d="M0 320 C120 282 240 346 360 308 S540 266 560 292" opacity=".28" />
        </svg>

        <div className="la-copy">
          <h1><span className="hl">Çalışan izinlerini</span><br />tek yerden yönetin</h1>
          <p>Talep, onay ve takip süreçlerini hızlandıran modern personel izin platformu.</p>
        </div>

        <div className="la-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          <span>Bu sisteme yalnızca yetkili personel erişebilir.<br />Tüm işlemler kayıt altına alınır.</span>
        </div>
      </section>

      {/* ===================== Sağ form paneli ===================== */}
      <section className="la-formwrap">
        <div className="la-card">
          <div className="la-mbrand">
            <img src={logo} alt="SmartAlpha" />
          </div>

          <h2>Tekrar hoş geldiniz</h2>
          <p className="la-sub">SmartAlpha izin yönetimine Google hesabınızla giriş yapın</p>

          {!clientId && (
            <p className="la-error">
              Google girişi yapılandırılmamış. Lütfen frontend/.env dosyasına
              VITE_GOOGLE_CLIENT_ID değerini ekleyin.
            </p>
          )}

          {error && <p className="la-error">{error}</p>}

          {/* Google'ın resmi "Google ile Giriş Yap" butonu buraya render edilir */}
          <div className="la-gbtn" ref={btnRef} />

          {busy && <p className="la-busy">Giriş yapılıyor…</p>}

          <div className="la-div">veya</div>

          <button type="button" className="la-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Erişim için yöneticinize başvurun
          </button>

          <p className="la-cr">© 2025 SmartAlpha. Tüm hakları saklıdır.</p>
        </div>
      </section>
    </div>
  );
}

// =======================================================================
// Main app (shown after login)
// =======================================================================
function MainApp({ token, user, onLogout }) {
  const role = user.role; // "calisan" | "yonetici"
  const [view, setView] = useState(role === "calisan" ? "yenitalep" : "onaylar");

  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);
  const [calendarData, setCalendarData] = useState({});

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [form, setForm] = useState({ type: "yillik", start: "", end: "", reason: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);

  // ---- Load employees once (yalnızca yönetici; /api/employees admin'e özel) ----
  useEffect(() => {
    if (role !== "yonetici") return;
    api.getEmployees(token).then(setEmployees).catch((err) => setError(err.message));
  }, [token, role]);

  // ---- Load requests ----
  const refreshRequests = useCallback(() => {
    setError("");
    api.getRequests(token).then(setRequests).catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  // ---- Load calendar ----
  useEffect(() => {
    if (view !== "takvim") return;
    setError("");
    api
      .getCalendar(token, calendarYear, calendarMonth)
      .then(setCalendarData)
      .catch((err) => setError(err.message));
  }, [view, calendarYear, calendarMonth, token]);

  const myRequests = useMemo(
    () => requests.slice().sort((a, b) => b.id - a.id),
    [requests]
  );

  const usedDays = useMemo(
    () =>
      requests
        .filter((r) => r.type === "yillik" && r.status !== "reddedildi")
        .reduce((sum, r) => sum + r.days, 0),
    [requests]
  );

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "beklemede").sort((a, b) => a.id - b.id),
    [requests]
  );

  async function submitRequest(e) {
    e.preventDefault();
    setFormError("");
    if (!form.start || !form.end) {
      setFormError("Lütfen başlangıç ve bitiş tarihi seçin.");
      return;
    }
    if (new Date(form.end) < new Date(form.start)) {
      setFormError("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createRequest(token, {
        type: form.type,
        start: form.start,
        end: form.end,
        reason: form.reason,
      });
      setForm({ type: "yillik", start: "", end: "", reason: "" });
      setView("taleplerim");
      refreshRequests();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function decide(id, decision) {
    setActionError("");
    try {
      await api.updateRequestStatus(token, id, decision);
      refreshRequests();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function cancelRequest(id) {
    setActionError("");
    try {
      await api.updateRequestStatus(token, id, "reddedildi");
      refreshRequests();
    } catch (err) {
      setActionError(err.message);
    }
  }

  function goToPrevMonth() {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  }

  const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();

  const navItems =
    role === "calisan"
      ? [
          { id: "yenitalep", label: "Yeni talep", icon: "ti-plus" },
          { id: "taleplerim", label: "Taleplerim", icon: "ti-clipboard-list" },
          { id: "takvim", label: "Takım takvimi", icon: "ti-calendar" },
        ]
      : [
          { id: "onaylar", label: "Onay bekleyenler", icon: "ti-clipboard-check" },
          { id: "tumtalepler", label: "Tüm talepler", icon: "ti-list" },
          { id: "takvim", label: "Takım takvimi", icon: "ti-calendar" },
        ];

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-primary)", maxWidth: 720, margin: "0 auto" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={logo} alt="SmartAlpha" style={{ height: 28 }} />
          <div>
            <h2 style={{ margin: 0 }}>İzin yönetimi</h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
              {role === "yonetici" ? "Yönetici paneli" : "Çalışan paneli"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar user={user} size={34} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{user.name}</span>
          <button onClick={onLogout} style={{ fontSize: 13, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true"></i>
            Çıkış yap
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: "var(--color-background-danger)",
          color: "var(--color-text-danger)",
          border: "0.5px solid var(--color-border-danger)",
          borderRadius: "var(--border-radius-md)",
          padding: "10px 14px", marginBottom: "1rem", fontSize: 14
        }}>
          {error}
        </div>
      )}

      {/* User summary card (employee only) */}
      {role === "calisan" && (
        <div style={{
          display: "flex", alignItems: "center", gap: "16px",
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "1rem 1.25rem", marginBottom: "1.5rem", flexWrap: "wrap"
        }}>
          <Avatar user={user} size={44} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 15 }}>{user.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>Çalışan</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Yıllık hak</div>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{user.balance}</div>
            </div>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Kullanılan</div>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{usedDays}</div>
            </div>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Kalan</div>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{Math.max(0, user.balance - usedDays)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: "8px" }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            style={{
              border: "none",
              background: view === item.id ? BRAND.light : "transparent",
              borderRadius: "var(--border-radius-md)",
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: view === item.id ? 500 : 400,
              cursor: "pointer",
              color: view === item.id ? BRAND.text : "var(--color-text-primary)",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <i className={`ti ${item.icon}`} style={{ fontSize: 16 }} aria-hidden="true"></i>
            {item.label}
          </button>
        ))}
      </div>

      {actionError && (
        <p style={{ fontSize: 13, color: "var(--color-text-danger)", marginBottom: 12 }}>{actionError}</p>
      )}

      {/* ---- Yeni talep form ---- */}
      {view === "yenitalep" && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "1.25rem"
        }}>
          <form onSubmit={submitRequest}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin türü</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: "100%" }}>
                  {Object.entries(LEAVE_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div></div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Başlangıç tarihi</label>
                <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Bitiş tarihi</label>
                <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} style={{ width: "100%" }} />
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Açıklama (opsiyonel)</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}
                placeholder="Örn. aile ziyareti, sağlık kontrolü..."
              />
            </div>
            {form.start && form.end && new Date(form.end) >= new Date(form.start) && (
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
                Toplam: <strong style={{ fontWeight: 500 }}>{diffDays(form.start, form.end)} gün</strong>
              </p>
            )}
            {formError && (
              <p style={{ fontSize: 13, color: "var(--color-text-danger)", marginBottom: 12 }}>{formError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: BRAND.primary, borderColor: BRAND.primary, color: "#fff",
              }}
            >
              <i className="ti ti-send" style={{ fontSize: 16 }} aria-hidden="true"></i>
              {submitting ? "Gönderiliyor..." : "Talebi gönder"}
            </button>
          </form>
        </div>
      )}

      {/* ---- Taleplerim (employee) ---- */}
      {view === "taleplerim" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {myRequests.length === 0 && (
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Henüz izin talebiniz yok.</p>
          )}
          {myRequests.map((r) => (
            <div key={r.id} style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              padding: "12px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <ColorBadge text={LEAVE_TYPES[r.type].label} ramp={LEAVE_TYPES[r.type].color} />
                <span style={{ fontSize: 14 }}>{formatDate(r.start)} – {formatDate(r.end)}</span>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>({r.days} gün)</span>
                {r.reason && <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>· {r.reason}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ColorBadge text={STATUS[r.status].label} ramp={STATUS[r.status].color} />
                {r.status === "beklemede" && (
                  <button onClick={() => cancelRequest(r.id)} style={{ fontSize: 13, padding: "4px 10px" }}>İptal et</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Onay bekleyenler (manager) ---- */}
      {view === "onaylar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {pendingRequests.length === 0 && (
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Onay bekleyen talep yok.</p>
          )}
          {pendingRequests.map((r) => {
            const emp = employees.find((u) => u.id === r.userId);
            return (
              <div key={r.id} style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "var(--color-background-secondary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 500, fontSize: 12, flexShrink: 0
                  }}>{emp?.initials ?? "?"}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{emp?.name ?? "Bilinmeyen kullanıcı"}</div>
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                      {LEAVE_TYPES[r.type].label} · {formatDate(r.start)} – {formatDate(r.end)} ({r.days} gün)
                      {r.reason && <> · {r.reason}</>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => decide(r.id, "onaylandi")}
                    style={{
                      fontSize: 13, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4,
                      background: BRAND.primary, borderColor: BRAND.primary, color: "#fff",
                    }}
                  >
                    <i className="ti ti-check" style={{ fontSize: 14 }} aria-hidden="true"></i> Onayla
                  </button>
                  <button onClick={() => decide(r.id, "reddedildi")} style={{ fontSize: 13, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true"></i> Reddet
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Tüm talepler (manager) ---- */}
      {view === "tumtalepler" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {requests.slice().sort((a, b) => b.id - a.id).map((r) => {
            const emp = employees.find((u) => u.id === r.userId);
            return (
              <div key={r.id} style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{emp?.name ?? "Bilinmeyen kullanıcı"}</span>
                  <ColorBadge text={LEAVE_TYPES[r.type].label} ramp={LEAVE_TYPES[r.type].color} />
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{formatDate(r.start)} – {formatDate(r.end)} ({r.days} gün)</span>
                </div>
                <ColorBadge text={STATUS[r.status].label} ramp={STATUS[r.status].color} />
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Takvim ---- */}
      {view === "takvim" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button onClick={goToPrevMonth} style={{ fontSize: 13, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
              <i className="ti ti-chevron-left" style={{ fontSize: 14 }} aria-hidden="true"></i>
              Önceki
            </button>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{MONTH_NAMES[calendarMonth - 1]} {calendarYear}</p>
            <button onClick={goToNextMonth} style={{ fontSize: 13, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
              Sonraki
              <i className="ti ti-chevron-right" style={{ fontSize: 14 }} aria-hidden="true"></i>
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)", padding: "4px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {Array.from({ length: startWeekday }).map((_, i) => (
              <div key={`empty-${i}`}></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const events = calendarData[String(day)] || [];
              return (
                <div key={day} style={{
                  minHeight: 64,
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "4px 6px",
                  display: "flex", flexDirection: "column", gap: 2
                }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{day}</span>
                  {events.slice(0, 2).map((ev, idx) => {
                    const c = RAMP_COLORS[LEAVE_TYPES[ev.type].color];
                    return (
                      <span key={idx} style={{
                        fontSize: 11, padding: "1px 5px", borderRadius: "var(--border-radius-md)",
                        background: c.bg, color: c.fg, fontWeight: 500,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                      }}>{ev.initials}</span>
                    );
                  })}
                  {events.length > 2 && (
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>+{events.length - 2} daha</span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            {Object.entries(LEAVE_TYPES).map(([key, val]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: RAMP_COLORS[val.color].bg, border: `1px solid ${RAMP_COLORS[val.color].fg}` }}></span>
                {val.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =======================================================================
// Root component: handles auth state (oturum localStorage'da saklanır)
// =======================================================================
const TOKEN_KEY = "izin_token";

export default function LeaveApp() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Sayfa açılışında kayıtlı oturumu geri yükle (oturum açık kalma)
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setCheckingSession(false);
      return;
    }
    api.getMe(saved)
      .then((u) => {
        setToken(saved);
        setUser(u);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY); // token geçersiz/süresi dolmuş
      })
      .finally(() => setCheckingSession(false));
  }, []);

  function handleLogin(newToken, newUser) {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    // Google otomatik yeniden girişini kapat
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }

  if (checkingSession) {
    return (
      <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-secondary)", padding: "2rem 0", textAlign: "center" }}>
        Yükleniyor...
      </div>
    );
  }

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <MainApp token={token} user={user} onLogout={handleLogout} />;
}
