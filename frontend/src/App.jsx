import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import logo from "./assets/logo.png";

const API_BASE = "";

// Brand color palette (purple)
const BRAND = {
  primary: "#6F03B5",      // logodaki mor
  primaryHover: "#58028F", // hover için koyu ton
  light: "#F2E7FB",        // açık mor arka plan
  text: "#4A0379",         // metin vurguları için koyu mor
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

// İzin talebindeki ek bilgileri (saat, işe dönüş, yer, telefon) kart içinde gösterir
function RequestExtra({ r }) {
  const bits = [];
  if (r.startTime || r.endTime) bits.push(`Saat: ${r.startTime || "?"}–${r.endTime || "?"}`);
  if (r.returnDate) bits.push(`İşe dönüş: ${formatDate(r.returnDate)}`);
  if (r.location) bits.push(`Yer: ${r.location}`);
  if (r.contactPhone) bits.push(`Tel: ${r.contactPhone}`);
  if (bits.length === 0) return null;
  return (
    <div style={{ width: "100%", marginTop: 2, fontSize: 12.5, color: "var(--color-text-secondary)", display: "flex", flexWrap: "wrap", gap: 12 }}>
      {bits.map((b, i) => <span key={i}>{b}</span>)}
    </div>
  );
}

// Genel bakış ekranında kullanılan kompakt talep kartı
function MiniRequest({ r, name }) {
  const t = LEAVE_TYPES[r.type] || { label: r.type, color: "gray" };
  const s = STATUS[r.status] || { label: r.status, color: "gray" };
  return (
    <div style={{ background: "#fff", border: "1px solid #ebe9f2", borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {name && <span style={{ fontWeight: 500, fontSize: 14 }}>{name}</span>}
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: RAMP_COLORS[t.color].bg, color: RAMP_COLORS[t.color].fg }}>{t.label}</span>
          <span style={{ fontSize: 14 }}>{formatDate(r.start)} – {formatDate(r.end)}</span>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>({r.days} gün)</span>
        </div>
        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: RAMP_COLORS[s.color].bg, color: RAMP_COLORS[s.color].fg }}>{s.label}</span>
      </div>
      <RequestExtra r={r} />
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
.la-input input:focus { outline: none; background: #fff; border-color: ${BRAND.primary}; box-shadow: 0 0 0 4px rgba(111,3,181,.15); }
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
.la-check input:focus-visible + .la-box { box-shadow: 0 0 0 4px rgba(111,3,181,.2); }
.la-link { color: ${BRAND.primary}; font-weight: 600; font-size: 14.5px; text-decoration: none; background: none; border: 0; cursor: pointer; padding: 0; font-family: inherit; }
.la-link:hover { text-decoration: underline; }
.la-error { color: var(--color-text-danger, #b42318); font-size: 13.5px; margin: 0 0 14px; }
.la-btn { width: 100%; height: 54px; border: 0; border-radius: 13px; background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryHover}); color: #fff; font-family: inherit; font-weight: 700; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 10px; transition: transform .08s ease, box-shadow .2s ease, filter .15s; box-shadow: 0 14px 26px -12px rgba(88,2,143,.7); }
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
const MAINAPP_CSS = `
.ev-shell * { box-sizing: border-box; }
.ev-shell { display: flex; width: 100%; flex: 1; min-height: 100vh; text-align: left; font-family: var(--sans, system-ui, sans-serif); color: #1f2233; }
.ev-sidebar { width: 280px; flex-shrink: 0; border-right: 1px solid #ebe9f2; display: flex; flex-direction: column; padding: 22px 16px; position: sticky; top: 0; align-self: flex-start; height: 100vh; }
.ev-logo { padding: 4px 10px 22px; }
.ev-logo img { height: 30px; width: auto; display: block; }
.ev-nav { display: flex; flex-direction: column; gap: 4px; }
.ev-navitem { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 10px; font-size: 14px; color: #5b5566; background: none; border: 0; cursor: pointer; font-family: inherit; text-align: left; width: 100%; transition: background .12s, color .12s; }
.ev-navitem i { font-size: 18px; }
.ev-navitem:hover { background: #f5f3fa; color: #1f2233; }
.ev-navitem.active { background: ${BRAND.light}; color: ${BRAND.text}; font-weight: 500; }
.ev-userbox { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-top: 1px solid #ebe9f2; }
.ev-icbtn { background: none; border: 0; cursor: pointer; color: #9a93a6; display: grid; place-items: center; padding: 6px; border-radius: 8px; }
.ev-icbtn:hover { background: #f5f3fa; color: ${BRAND.primary}; }
.ev-main { flex: 1; min-width: 0; padding: 28px 40px; }
.ev-topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }
.ev-h1 { font-size: 21px; font-weight: 600; margin: 0; color: #1f2233; }
.ev-sub { font-size: 13px; color: var(--color-text-secondary, #6b6375); margin: 3px 0 0; }
.ev-btn-primary { display: inline-flex; align-items: center; gap: 6px; background: ${BRAND.primary}; color: #fff; border: 0; border-radius: 10px; padding: 9px 15px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; }
.ev-btn-primary:hover { background: ${BRAND.primaryHover}; }
.ev-btn-ghost { display: inline-flex; align-items: center; gap: 6px; background: #fff; color: #5b5566; border: 1px solid #e3e1ec; border-radius: 10px; padding: 8px 13px; font-size: 13px; cursor: pointer; font-family: inherit; }
.ev-btn-ghost:hover { border-color: #cfcad9; }
.ev-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
.ev-stat { background: #f7f5fb; border-radius: 12px; padding: 16px 18px; }
.ev-stat .lab { font-size: 13px; color: var(--color-text-secondary, #6b6375); }
.ev-stat .val { font-size: 26px; font-weight: 600; margin-top: 4px; }
.ev-card { background: #fff; border: 1px solid #ebe9f2; border-radius: 14px; padding: 16px 18px; }
.ev-progress { height: 8px; border-radius: 999px; background: #efedf4; overflow: hidden; }
.ev-progress > div { height: 100%; background: ${BRAND.primary}; }
@media (max-width: 820px) {
  .ev-shell { flex-direction: column; min-height: 0; }
  .ev-sidebar { width: auto; height: auto; position: static; border-right: 0; border-bottom: 1px solid #ebe9f2; flex-direction: row; align-items: center; flex-wrap: wrap; gap: 6px; padding: 12px; }
  .ev-logo { padding: 0 8px 0 4px; }
  .ev-nav { flex-direction: row; flex-wrap: wrap; gap: 4px; flex: 1; }
  .ev-navitem { width: auto; padding: 8px 10px; }
  .ev-userbox { margin-top: 0; border-top: 0; padding: 4px; }
  .ev-main { padding: 18px 16px; }
}
`;

function MainApp({ token, user, onLogout }) {
  const realRole = user.role; // gerçek rol: "calisan" | "yonetici"
  const isAdmin = realRole === "yonetici";
  const [previewEmployee, setPreviewEmployee] = useState(false); // admin: çalışan görünümünü önizle
  const role = isAdmin && previewEmployee ? "calisan" : realRole; // arayüzde kullanılan etkin rol
  const [view, setView] = useState("genelbakis");

  function togglePreview() {
    setPreviewEmployee((p) => {
      setView("genelbakis"); // görünümü sıfırla
      return !p;
    });
  }

  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);
  const [calendarData, setCalendarData] = useState({});

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [form, setForm] = useState({
    type: "yillik", start: "", end: "", startTime: "", endTime: "",
    returnDate: "", location: "", contactPhone: "", reason: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);

  // ---- Load employees once (yalnızca yönetici; /api/employees admin'e özel) ----
  useEffect(() => {
    if (realRole !== "yonetici") return;
    api.getEmployees(token).then(setEmployees).catch((err) => setError(err.message));
  }, [token, realRole]);

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
    () => requests.filter((r) => r.userId === user.id).sort((a, b) => b.id - a.id),
    [requests, user.id]
  );

  const usedDays = useMemo(
    () =>
      requests
        .filter((r) => r.userId === user.id && r.type === "yillik" && r.status !== "reddedildi")
        .reduce((sum, r) => sum + r.days, 0),
    [requests, user.id]
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
        startTime: form.startTime,
        endTime: form.endTime,
        returnDate: form.returnDate,
        location: form.location,
        contactPhone: form.contactPhone,
        reason: form.reason,
      });
      setForm({
        type: "yillik", start: "", end: "", startTime: "", endTime: "",
        returnDate: "", location: "", contactPhone: "", reason: "",
      });
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

  function goToPrevYear() { setCalendarYear((y) => y - 1); }
  function goToNextYear() { setCalendarYear((y) => y + 1); }

  const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();

  const navItems =
    role === "calisan"
      ? [
          { id: "genelbakis", label: "Genel bakış", icon: "ti-layout-dashboard" },
          { id: "yenitalep", label: "Yeni talep", icon: "ti-plus" },
          { id: "taleplerim", label: "Taleplerim", icon: "ti-clipboard-list" },
          { id: "takvim", label: "Takım takvimi", icon: "ti-calendar" },
        ]
      : [
          { id: "genelbakis", label: "Genel bakış", icon: "ti-layout-dashboard" },
          { id: "onaylar", label: "Onay bekleyenler", icon: "ti-clipboard-check" },
          { id: "tumtalepler", label: "Tüm talepler", icon: "ti-list" },
          { id: "takvim", label: "Takım takvimi", icon: "ti-calendar" },
        ];

  const firstName = (user.name || "").split(" ")[0];
  const VIEW_TITLES = {
    genelbakis: [`Merhaba, ${firstName}`, "İzin durumun ve son hareketler"],
    yenitalep: ["Yeni talep", "İzin talebi oluştur"],
    taleplerim: ["Taleplerim", "Oluşturduğun izin talepleri"],
    onaylar: ["Onay bekleyenler", "İncelenecek talepler"],
    tumtalepler: ["Tüm talepler", "Tüm çalışanların talepleri"],
    takvim: ["Takım takvimi", "Onaylı izinler"],
  };
  const [pageTitle, pageSub] = VIEW_TITLES[view] || ["İzin yönetimi", ""];

  return (
    <div className="ev-shell">
      <style>{MAINAPP_CSS}</style>

      <aside className="ev-sidebar">
        <div className="ev-logo"><img src={logo} alt="SmartAlpha" /></div>
        <nav className="ev-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`ev-navitem${view === item.id ? " active" : ""}`}
              onClick={() => setView(item.id)}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true"></i>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ev-userbox">
          <Avatar user={user} size={34} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ fontSize: 12, color: "#9a93a6" }}>{realRole === "yonetici" ? "Yönetici" : "Çalışan"}</div>
          </div>
          <button className="ev-icbtn" onClick={onLogout} aria-label="Çıkış yap" title="Çıkış yap">
            <i className="ti ti-logout" style={{ fontSize: 18 }}></i>
          </button>
        </div>
      </aside>

      <main className="ev-main">
        <div className="ev-topbar">
          <div>
            <h1 className="ev-h1">{pageTitle}</h1>
            <p className="ev-sub">{pageSub}</p>
          </div>
          {isAdmin && (
            <button className="ev-btn-ghost" onClick={togglePreview}>
              <i className={`ti ${previewEmployee ? "ti-arrow-back-up" : "ti-eye"}`} aria-hidden="true"></i>
              {previewEmployee ? "Yönetici görünümü" : "Çalışan görünümü"}
            </button>
          )}
        </div>

        {previewEmployee && (
          <div style={{
            background: BRAND.light, color: BRAND.text,
            borderRadius: 10, padding: "8px 14px",
            marginBottom: "1rem", fontSize: 13, display: "flex", alignItems: "center", gap: 8
          }}>
            <i className="ti ti-eye" aria-hidden="true"></i>
            Önizleme: çalışan görünümü — verileriniz değişmez.
          </div>
        )}

        {error && (
          <div style={{
            background: "var(--color-background-danger, #fdecea)",
            color: "var(--color-text-danger, #b42318)",
            border: "1px solid #f3c8c2",
            borderRadius: 10, padding: "10px 14px", marginBottom: "1rem", fontSize: 14
          }}>
            {error}
          </div>
        )}

        {actionError && (
          <p style={{ fontSize: 13, color: "var(--color-text-danger, #b42318)", marginBottom: 12 }}>{actionError}</p>
        )}

        {/* ---- Genel bakış ---- */}
        {view === "genelbakis" && role === "calisan" && (
          <div>
            <div className="ev-stats">
              <div className="ev-stat"><div className="lab">Yıllık hak</div><div className="val">{user.balance}</div></div>
              <div className="ev-stat"><div className="lab">Kullanılan</div><div className="val">{usedDays}</div></div>
              <div className="ev-stat"><div className="lab">Kalan</div><div className="val" style={{ color: BRAND.primary }}>{Math.max(0, user.balance - usedDays)}</div></div>
            </div>
            <div className="ev-card" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                <span>Kullanım</span><span>{usedDays} / {user.balance} gün</span>
              </div>
              <div className="ev-progress"><div style={{ width: `${Math.min(100, Math.round((usedDays / Math.max(1, user.balance)) * 100))}%` }}></div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Son talepler</div>
              <button className="ev-btn-ghost" onClick={() => setView("yenitalep")}><i className="ti ti-plus" aria-hidden="true"></i>Yeni talep</button>
            </div>
            {myRequests.length === 0 ? (
              <div className="ev-card" style={{ color: "#9a93a6", fontSize: 14 }}>Henüz izin talebin yok.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myRequests.slice(0, 4).map((r) => <MiniRequest key={r.id} r={r} />)}
              </div>
            )}
          </div>
        )}

        {view === "genelbakis" && role === "yonetici" && (
          <div>
            <div className="ev-stats">
              <div className="ev-stat"><div className="lab">Bekleyen onay</div><div className="val" style={{ color: BRAND.primary }}>{pendingRequests.length}</div></div>
              <div className="ev-stat"><div className="lab">Toplam çalışan</div><div className="val">{employees.length}</div></div>
              <div className="ev-stat"><div className="lab">Onaylanan</div><div className="val">{requests.filter((r) => r.status === "onaylandi").length}</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Onay bekleyenler</div>
              {pendingRequests.length > 0 && (
                <button className="ev-btn-ghost" onClick={() => setView("onaylar")}>Tümünü gör</button>
              )}
            </div>
            {pendingRequests.length === 0 ? (
              <div className="ev-card" style={{ color: "#9a93a6", fontSize: 14 }}>Bekleyen talep yok.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pendingRequests.slice(0, 4).map((r) => {
                  const emp = employees.find((u) => u.id === r.userId);
                  return <MiniRequest key={r.id} r={r} name={emp ? emp.name : "Çalışan"} />;
                })}
              </div>
            )}
          </div>
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
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Çalışmaya başlanacak tarih</label>
                <input type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin başlangıç tarihi</label>
                <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin bitiş tarihi</label>
                <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Başlangıç saati</label>
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Bitiş saati</label>
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin geçirilecek yer</label>
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Örn. İzmir, memleket"
                  style={{ width: "100%", fontFamily: "inherit", fontSize: 14, padding: "6px 10px", borderRadius: "var(--border-radius-md)", border: "1px solid #cfcfd6", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Ulaşılabilecek telefon</label>
                <input type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  placeholder="05xx xxx xx xx"
                  style={{ width: "100%", fontFamily: "inherit", fontSize: 14, padding: "6px 10px", borderRadius: "var(--border-radius-md)", border: "1px solid #cfcfd6", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Açıklama (opsiyonel)</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "1px solid #cfcfd6" }}
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
              <RequestExtra r={r} />
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
                <RequestExtra r={r} />
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
                <RequestExtra r={r} />
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Takvim ---- */}
      {view === "takvim" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={goToPrevYear} style={{ fontSize: 13, padding: "4px 9px", display: "flex", alignItems: "center", gap: 3 }} title="Önceki yıl" aria-label="Önceki yıl">
                <i className="ti ti-chevrons-left" style={{ fontSize: 14 }} aria-hidden="true"></i>
                Yıl
              </button>
              <button onClick={goToPrevMonth} style={{ fontSize: 13, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }} title="Önceki ay">
                <i className="ti ti-chevron-left" style={{ fontSize: 14 }} aria-hidden="true"></i>
                Ay
              </button>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{MONTH_NAMES[calendarMonth - 1]} {calendarYear}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={goToNextMonth} style={{ fontSize: 13, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }} title="Sonraki ay">
                Ay
                <i className="ti ti-chevron-right" style={{ fontSize: 14 }} aria-hidden="true"></i>
              </button>
              <button onClick={goToNextYear} style={{ fontSize: 13, padding: "4px 9px", display: "flex", alignItems: "center", gap: 3 }} title="Sonraki yıl" aria-label="Sonraki yıl">
                Yıl
                <i className="ti ti-chevrons-right" style={{ fontSize: 14 }} aria-hidden="true"></i>
              </button>
            </div>
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
      </main>
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
