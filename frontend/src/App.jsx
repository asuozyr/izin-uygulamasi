import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import logo from "./assets/logo.png";
import logoDark from "./assets/logo-dark.png";

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
  iptal: { label: "İptal edildi", color: "c-pink" },
};

const RAMP_COLORS = {
  "c-blue": { bg: "#E6F1FB", fg: "#0C447C" },
  "c-amber": { bg: "#FAEEDA", fg: "#854F0B" },
  "c-coral": { bg: "#FAECE7", fg: "#993C1D" },
  "c-gray": { bg: "#F1EFE8", fg: "#444441" },
  "c-green": { bg: "#EAF3DE", fg: "#27500A" },
  "c-red": { bg: "#FCEBEB", fg: "#791F1F" },
  "c-pink": { bg: "#FBEAF0", fg: "#72243E" },
};

const DURATION_OPTIONS = [
  ["full_day", "Tam gün"],
  ["half_day_morning", "Yarım gün (sabah)"],
  ["half_day_afternoon", "Yarım gün (öğleden sonra)"],
];
const DURATION_LABEL = {
  full_day: "Tam gün",
  half_day_morning: "Yarım gün (sabah)",
  half_day_afternoon: "Yarım gün (öğleden sonra)",
};
const isHalfDay = (d) => d === "half_day_morning" || d === "half_day_afternoon";

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
  if (isHalfDay(r.durationType)) bits.push(r.durationType === "half_day_morning" ? "Yarım gün (sabah)" : "Yarım gün (öğleden sonra)");
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
    <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 14, padding: "12px 14px" }}>
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
  adminCreateRequest: (token, payload) =>
    apiRequest("/api/admin/requests", { method: "POST", body: JSON.stringify(payload) }, token),
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
.ev-shell { display: flex; width: 100%; flex: 1; min-height: 100vh; text-align: left; font-family: var(--sans, system-ui, sans-serif); color: var(--color-text-primary); background: var(--app-bg); }
.ev-sidebar { width: 280px; flex-shrink: 0; border-right: 1px solid var(--color-border-tertiary); display: flex; flex-direction: column; padding: 22px 16px; position: sticky; top: 0; align-self: flex-start; height: 100vh; }
.ev-logo { padding: 4px 10px 22px; }
.ev-logo img { height: 30px; width: auto; display: block; }
.ev-logo .logo-dark { display: none; }
.ev-nav { display: flex; flex-direction: column; gap: 4px; }
.ev-navitem { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 10px; font-size: 14px; color: var(--color-text-secondary); background: none; border: 0; cursor: pointer; font-family: inherit; text-align: left; width: 100%; transition: background .12s, color .12s; }
.ev-navitem i { font-size: 18px; }
.ev-navitem:hover { background: var(--surface-hover); color: var(--color-text-primary); }
.ev-navitem.active { background: var(--accent-bg); color: var(--accent); font-weight: 500; }
.ev-userbox { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-top: 1px solid var(--color-border-tertiary); }
.ev-icbtn { background: none; border: 0; cursor: pointer; color: var(--color-text-tertiary); display: grid; place-items: center; padding: 6px; border-radius: 8px; }
.ev-icbtn:hover { background: var(--surface-hover); color: var(--accent); }
.ev-main { flex: 1; min-width: 0; padding: 28px 40px; }
.ev-topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }
.ev-h1 { font-size: 21px; font-weight: 600; margin: 0; color: var(--color-text-primary); }
.ev-sub { font-size: 13px; color: var(--color-text-secondary); margin: 3px 0 0; }
.ev-btn-primary { display: inline-flex; align-items: center; gap: 6px; background: ${BRAND.primary}; color: #fff; border: 0; border-radius: 10px; padding: 9px 15px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; }
.ev-btn-primary:hover { background: ${BRAND.primaryHover}; }
.ev-btn-ghost { display: inline-flex; align-items: center; gap: 6px; background: var(--color-background-primary); color: var(--color-text-secondary); border: 1px solid var(--color-border-secondary); border-radius: 10px; padding: 8px 13px; font-size: 13px; cursor: pointer; font-family: inherit; transition: background .12s, border-color .12s; }
.ev-btn-ghost:hover { background: var(--surface-hover); border-color: var(--color-text-tertiary); }
.ev-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
.ev-stat { background: var(--color-background-secondary); border: 1px solid var(--color-border-tertiary); border-radius: 12px; padding: 16px 18px; }
.ev-stat .lab { font-size: 13px; color: var(--color-text-secondary); }
.ev-stat .val { font-size: 26px; font-weight: 600; margin-top: 4px; color: var(--color-text-primary); }
.ev-card { background: var(--color-background-primary); border: 1px solid var(--color-border-tertiary); border-radius: 14px; padding: 16px 18px; }
.ev-progress { height: 8px; border-radius: 999px; background: var(--color-background-tertiary); overflow: hidden; }
.ev-progress > div { height: 100%; background: ${BRAND.primary}; }
@media (prefers-color-scheme: dark) {
  .ev-logo .logo-light { display: none; }
  .ev-logo .logo-dark { display: block; }
}
@media (max-width: 820px) {
  .ev-shell { flex-direction: column; min-height: 0; }
  .ev-sidebar { width: auto; height: auto; position: static; border-right: 0; border-bottom: 1px solid var(--color-border-tertiary); flex-direction: row; align-items: center; flex-wrap: wrap; gap: 6px; padding: 12px; }
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

  // Takvim: responsive görünür izin sayısı + gün detay modalı
  const [calMax, setCalMax] = useState(3);
  const [dayModal, setDayModal] = useState(null); // { day, entries } | null
  useEffect(() => {
    const calc = () => setCalMax(window.innerWidth < 700 ? 1 : window.innerWidth < 1100 ? 2 : 3);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  useEffect(() => {
    if (!dayModal) return;
    const onKey = (e) => { if (e.key === "Escape") setDayModal(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dayModal]);

  const [form, setForm] = useState({
    type: "yillik", durationType: "full_day", start: "", end: "", startTime: "", endTime: "",
      returnDate: "", location: "", countryCode: "+90", contactPhone: "", reason: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form alanı değişince ilgili hatayı temizle
  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => (fe[name] ? { ...fe, [name]: undefined } : fe));
  }
  const ERR_COLOR = "#e24b4a";
  const errStyle = (name) =>
    fieldErrors[name] ? { border: `1px solid ${ERR_COLOR}`, borderRadius: "var(--border-radius-md)" } : {};

  // --- Yönetici: çalışan adına izin girişi (ayrı form state'i) ---
  const [adminForm, setAdminForm] = useState({
    userId: "", type: "yillik", durationType: "full_day", start: "", end: "", returnDate: "",
    startTime: "", endTime: "", location: "", countryCode: "+90", contactPhone: "", reason: "",
  });
  const [adminErrors, setAdminErrors] = useState({});
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  function updateAdminField(name, value) {
    setAdminForm((f) => ({ ...f, [name]: value }));
    setAdminErrors((fe) => (fe[name] ? { ...fe, [name]: undefined } : fe));
    setAdminMsg("");
  }
  const adminErrStyle = (name) =>
    adminErrors[name] ? { border: `1px solid ${ERR_COLOR}`, borderRadius: "var(--border-radius-md)" } : {};

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
        .filter((r) => r.userId === user.id && r.type === "yillik" && r.status !== "reddedildi" && r.status !== "iptal")
        .reduce((sum, r) => sum + r.days, 0),
    [requests, user.id]
  );

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "beklemede").sort((a, b) => a.id - b.id),
    [requests]
  );

  // Telefon: yalnız rakam, +, boşluk, parantez, tire; ülke kodu dahil 8-15 rakam
  function phoneError(countryCode, number) {
    const full = `${countryCode || ""} ${number || ""}`.trim();
    if (!number || !number.trim()) return "Bu alan zorunlu.";
    if (!/^[0-9+\s()\-]+$/.test(full)) return "Lütfen geçerli bir telefon numarası girin.";
    const digits = full.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return "Lütfen geçerli bir telefon numarası girin.";
    return null;
  }

  function validateForm() {
    const errs = {};
    if (!form.type) errs.type = "Bu alan zorunlu.";
    if (!form.returnDate) errs.returnDate = "Bu alan zorunlu.";
    if (!form.start) errs.start = "Bu alan zorunlu.";
    if (form.durationType === "full_day") {
      if (!form.end) errs.end = "Bu alan zorunlu.";
      if (form.start && form.end && new Date(form.end) < new Date(form.start)) {
        errs.end = "Bitiş tarihi başlangıçtan önce olamaz.";
      }
    }
    if (!form.startTime) errs.startTime = "Bu alan zorunlu.";
    if (!form.endTime) errs.endTime = "Bu alan zorunlu.";
    if (!form.location || !form.location.trim()) errs.location = "Bu alan zorunlu.";
    const pErr = phoneError(form.countryCode, form.contactPhone);
    if (pErr) errs.contactPhone = pErr;
    return errs;
  }

  async function submitRequest(e) {
    e.preventDefault();
    setFormError("");
    const errs = validateForm();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setFormError("Lütfen işaretli alanları düzeltin.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createRequest(token, {
        type: form.type,
        durationType: form.durationType,
        start: form.start,
        end: form.durationType === "full_day" ? form.end : form.start,
        startTime: form.startTime,
        endTime: form.endTime,
        returnDate: form.returnDate,
        location: form.location.trim(),
        contactPhone: `${form.countryCode} ${form.contactPhone}`.trim(),
        reason: form.reason,
      });
      setForm({
        type: "yillik", durationType: "full_day", start: "", end: "", startTime: "", endTime: "",
      returnDate: "", location: "", countryCode: "+90", contactPhone: "", reason: "",
      });
      setFieldErrors({});
      setView("taleplerim");
      refreshRequests();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Yönetici formu: çalışan, tür, başlangıç, bitiş ve işe dönüş zorunlu; saat/yer/telefon/açıklama opsiyonel.
  function validateAdminForm() {
    const errs = {};
    if (!adminForm.userId) errs.userId = "Bu alan zorunlu.";
    if (!adminForm.type) errs.type = "Bu alan zorunlu.";
    if (!adminForm.start) errs.start = "Bu alan zorunlu.";
    if (adminForm.durationType === "full_day") {
      if (!adminForm.end) errs.end = "Bu alan zorunlu.";
      if (adminForm.start && adminForm.end && new Date(adminForm.end) < new Date(adminForm.start)) {
        errs.end = "Bitiş tarihi başlangıçtan önce olamaz.";
      }
    }
    if (!adminForm.returnDate) errs.returnDate = "Bu alan zorunlu.";
    if (adminForm.contactPhone && adminForm.contactPhone.trim()) {
      const pErr = phoneError(adminForm.countryCode, adminForm.contactPhone);
      if (pErr) errs.contactPhone = pErr;
    }
    return errs;
  }

  async function submitAdminRequest(e) {
    e.preventDefault();
    setActionError("");
    setAdminMsg("");
    const errs = validateAdminForm();
    setAdminErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setAdminSubmitting(true);
    try {
      await api.adminCreateRequest(token, {
        userId: adminForm.userId,
        type: adminForm.type,
        durationType: adminForm.durationType,
        start: adminForm.start,
        end: adminForm.durationType === "full_day" ? adminForm.end : adminForm.start,
        returnDate: adminForm.returnDate,
        startTime: adminForm.startTime,
        endTime: adminForm.endTime,
        location: adminForm.location.trim(),
        contactPhone: adminForm.contactPhone.trim() ? `${adminForm.countryCode} ${adminForm.contactPhone}`.trim() : "",
        reason: adminForm.reason,
      });
      const empName = employees.find((x) => x.id === adminForm.userId)?.name || "Çalışan";
      setAdminMsg(`${empName} adına izin kaydı oluşturuldu ve onaylandı.`);
      setAdminForm({
        userId: "", type: "yillik", durationType: "full_day", start: "", end: "", returnDate: "",
        startTime: "", endTime: "", location: "", countryCode: "+90", contactPhone: "", reason: "",
      });
      setAdminErrors({});
      refreshRequests();
      api.getEmployees(token).then(setEmployees).catch(() => {});
    } catch (err) {
      setActionError(err.message);
    } finally {
      setAdminSubmitting(false);
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

  // Yönetici: hatalı/yanlış bir talebi iptal eder (silmez, "iptal" durumuna alır)
  async function cancelByAdmin(id) {
    if (!window.confirm("Bu izin talebini iptal etmek istediğinize emin misiniz?")) return;
    setActionError("");
    try {
      await api.updateRequestStatus(token, id, "iptal");
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
          { id: "izingir", label: "Çalışan adına izin gir", icon: "ti-user-plus" },
          { id: "calisanlar", label: "Çalışanlar", icon: "ti-users" },
          { id: "takvim", label: "Takım takvimi", icon: "ti-calendar" },
        ];

  const firstName = (user.name || "").split(" ")[0];
  const VIEW_TITLES = {
    genelbakis: [`Merhaba, ${firstName}`, "İzin durumun ve son hareketler"],
    yenitalep: ["Yeni talep", "İzin talebi oluştur"],
    taleplerim: ["Taleplerim", "Oluşturduğun izin talepleri"],
    onaylar: ["Onay bekleyenler", "İncelenecek talepler"],
    tumtalepler: ["Tüm talepler", "Tüm çalışanların talepleri"],
    izingir: ["Çalışan adına izin gir", "Yönetici olarak çalışan için izin kaydı oluştur"],
    calisanlar: ["Çalışanlar", "Tüm çalışanların izin hakedişi"],
    takvim: ["Takım takvimi", "Onaylı izinler"],
  };
  const [pageTitle, pageSub] = VIEW_TITLES[view] || ["İzin yönetimi", ""];

  return (
    <div className="ev-shell">
      <style>{MAINAPP_CSS}</style>

      <aside className="ev-sidebar">
        <div className="ev-logo">
          <img className="logo-light" src={logo} alt="SmartAlpha" />
          <img className="logo-dark" src={logoDark} alt="SmartAlpha" />
        </div>
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
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{realRole === "yonetici" ? "Yönetici" : "Çalışan"}</div>
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
            background: "var(--accent-bg)", color: "var(--accent)",
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
            border: "1px solid var(--color-border-danger, #f3c8c2)",
            borderRadius: 10, padding: "10px 14px", marginBottom: "1rem", fontSize: 14
          }}>
            {error}
          </div>
        )}

        {actionError && (
          <p style={{ fontSize: 13, color: "var(--color-text-danger, #b42318)", marginBottom: 12 }}>{actionError}</p>
        )}

        {/* ---- Genel bakış ---- */}
        {view === "genelbakis" && role === "calisan" && (() => {
          const earned = Number(user.totalEarned ?? user.balance ?? 0);
          const used = Number(user.usedLeave ?? usedDays ?? 0);
          const remaining = Number(user.remainingLeave ?? (earned - used));
          const fmt = (n) => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
          return (
          <div>
            <div className="ev-stats">
              <div className="ev-stat"><div className="lab">Hak edilen izin</div><div className="val">{fmt(earned)}</div></div>
              <div className="ev-stat"><div className="lab">Kullanılan izin</div><div className="val">{fmt(used)}</div></div>
              <div className="ev-stat"><div className="lab">Kalan izin hakkı</div><div className="val" style={{ color: remaining < 0 ? "var(--color-text-danger)" : BRAND.primary }}>{fmt(remaining)}</div></div>
            </div>
            {remaining < 0 && (
              <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", border: "1px solid var(--color-border-danger)", borderRadius: 10, padding: "8px 14px", marginBottom: 16, fontSize: 13 }}>
                Kalan izin hakkınız eksiye düştü ({fmt(remaining)} gün). Talepler yine de oluşturulabilir.
              </div>
            )}
            <div className="ev-card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                <span>Kullanım</span><span>{fmt(used)} / {fmt(earned)} gün</span>
              </div>
              <div className="ev-progress"><div style={{ width: `${Math.min(100, Math.round((used / Math.max(1, earned)) * 100))}%` }}></div></div>
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 22px" }}>
              {user.hireDate ? `İşe giriş: ${formatDate(user.hireDate)} • ` : ""}Her ay 1,25 gün + tamamlanan her yıl 1 gün otomatik hesaplanır.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Son talepler</div>
              <button className="ev-btn-ghost" onClick={() => setView("yenitalep")}><i className="ti ti-plus" aria-hidden="true"></i>Yeni talep</button>
            </div>
            {myRequests.length === 0 ? (
              <div className="ev-card" style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}>Henüz izin talebin yok.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myRequests.slice(0, 4).map((r) => <MiniRequest key={r.id} r={r} />)}
              </div>
            )}
          </div>
          );
        })()}

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
              <div className="ev-card" style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}>Bekleyen talep yok.</div>
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
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin süresi</label>
                <select value={form.durationType} onChange={(e) => updateField("durationType", e.target.value)} style={{ width: "100%" }}>
                  {DURATION_OPTIONS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin türü</label>
                <select value={form.type} onChange={(e) => updateField("type", e.target.value)} style={{ width: "100%", ...errStyle("type") }}>
                  {Object.entries(LEAVE_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                {fieldErrors.type && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{fieldErrors.type}</p>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Çalışmaya başlanacak tarih</label>
                <input type="date" value={form.returnDate} onChange={(e) => updateField("returnDate", e.target.value)} style={{ width: "100%", ...errStyle("returnDate") }} />
                {fieldErrors.returnDate && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{fieldErrors.returnDate}</p>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin başlangıç tarihi</label>
                <input type="date" value={form.start} onChange={(e) => updateField("start", e.target.value)} style={{ width: "100%", ...errStyle("start") }} />
                {fieldErrors.start && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{fieldErrors.start}</p>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin bitiş tarihi</label>
                {form.durationType === "full_day" ? (
                  <>
                    <input type="date" value={form.end} onChange={(e) => updateField("end", e.target.value)} style={{ width: "100%", ...errStyle("end") }} />
                    {fieldErrors.end && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{fieldErrors.end}</p>}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "8px 0 0" }}>Yarım gün — tek tarih (0,5 gün)</p>
                )}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Başlangıç saati</label>
                <input type="time" value={form.startTime} onChange={(e) => updateField("startTime", e.target.value)} style={{ width: "100%", ...errStyle("startTime") }} />
                {fieldErrors.startTime && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{fieldErrors.startTime}</p>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Bitiş saati</label>
                <input type="time" value={form.endTime} onChange={(e) => updateField("endTime", e.target.value)} style={{ width: "100%", ...errStyle("endTime") }} />
                {fieldErrors.endTime && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{fieldErrors.endTime}</p>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin geçirilecek yer</label>
                <input type="text" value={form.location} onChange={(e) => updateField("location", e.target.value)}
                  placeholder="Örn. İzmir, memleket"
                  style={{ width: "100%", fontFamily: "inherit", fontSize: 14, padding: "6px 10px", borderRadius: "var(--border-radius-md)", border: `1px solid ${fieldErrors.location ? ERR_COLOR : "var(--color-border-secondary)"}`, boxSizing: "border-box" }} />
                {fieldErrors.location && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{fieldErrors.location}</p>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Ulaşılabilecek telefon</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="text" list="ulke-kodlari" value={form.countryCode} onChange={(e) => updateField("countryCode", e.target.value)}
                    aria-label="Ülke kodu"
                    style={{ width: 78, flexShrink: 0, fontFamily: "inherit", fontSize: 14, padding: "6px 8px", borderRadius: "var(--border-radius-md)", border: `1px solid ${fieldErrors.contactPhone ? ERR_COLOR : "var(--color-border-secondary)"}`, boxSizing: "border-box" }} />
                  <input type="tel" value={form.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)}
                    placeholder="5xx xxx xx xx"
                    style={{ flex: 1, minWidth: 0, fontFamily: "inherit", fontSize: 14, padding: "6px 10px", borderRadius: "var(--border-radius-md)", border: `1px solid ${fieldErrors.contactPhone ? ERR_COLOR : "var(--color-border-secondary)"}`, boxSizing: "border-box" }} />
                  <datalist id="ulke-kodlari">
                    <option value="+90">Türkiye</option>
                    <option value="+1">ABD / Kanada</option>
                    <option value="+44">Birleşik Krallık</option>
                    <option value="+49">Almanya</option>
                    <option value="+33">Fransa</option>
                    <option value="+31">Hollanda</option>
                    <option value="+39">İtalya</option>
                    <option value="+34">İspanya</option>
                    <option value="+41">İsviçre</option>
                    <option value="+43">Avusturya</option>
                    <option value="+32">Belçika</option>
                    <option value="+7">Rusya</option>
                    <option value="+971">BAE</option>
                    <option value="+966">S. Arabistan</option>
                    <option value="+994">Azerbaycan</option>
                  </datalist>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>Örn. +90 5xx xxx xx xx</p>
                {fieldErrors.contactPhone && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{fieldErrors.contactPhone}</p>}
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Açıklama (opsiyonel)</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "1px solid var(--color-border-secondary)" }}
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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ColorBadge text={STATUS[r.status].label} ramp={STATUS[r.status].color} />
                  {realRole === "yonetici" && !previewEmployee && (r.status === "beklemede" || r.status === "onaylandi") && (
                    <button onClick={() => cancelByAdmin(r.id)} title="Talebi iptal et"
                      style={{ fontSize: 13, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4, color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>
                      <i className="ti ti-ban" style={{ fontSize: 14 }} aria-hidden="true"></i> İptal et
                    </button>
                  )}
                </div>
                <RequestExtra r={r} />
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Çalışan adına izin gir (yönetici) ---- */}
      {view === "izingir" && role === "yonetici" && (
        <div className="ev-card" style={{ maxWidth: 820 }}>
          {adminMsg && (
            <div style={{
              background: "var(--color-background-success)", color: "var(--color-text-success)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14,
              display: "flex", alignItems: "center", gap: 8
            }}>
              <i className="ti ti-circle-check" aria-hidden="true"></i> {adminMsg}
            </div>
          )}
          <form onSubmit={submitAdminRequest}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Çalışan</label>
              <select value={adminForm.userId} onChange={(e) => updateAdminField("userId", e.target.value)} style={{ width: "100%", ...adminErrStyle("userId") }}>
                <option value="">Çalışan seçin…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}{e.role === "yonetici" ? " (yönetici)" : ""}</option>
                ))}
              </select>
              {adminErrors.userId && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{adminErrors.userId}</p>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin süresi</label>
                <select value={adminForm.durationType} onChange={(e) => updateAdminField("durationType", e.target.value)} style={{ width: "100%" }}>
                  {DURATION_OPTIONS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin türü</label>
                <select value={adminForm.type} onChange={(e) => updateAdminField("type", e.target.value)} style={{ width: "100%", ...adminErrStyle("type") }}>
                  {Object.entries(LEAVE_TYPES).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                </select>
                {adminErrors.type && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{adminErrors.type}</p>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İşe dönüş tarihi</label>
                <input type="date" value={adminForm.returnDate} onChange={(e) => updateAdminField("returnDate", e.target.value)} style={{ width: "100%", ...adminErrStyle("returnDate") }} />
                {adminErrors.returnDate && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{adminErrors.returnDate}</p>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin başlangıç tarihi</label>
                <input type="date" value={adminForm.start} onChange={(e) => updateAdminField("start", e.target.value)} style={{ width: "100%", ...adminErrStyle("start") }} />
                {adminErrors.start && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{adminErrors.start}</p>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin bitiş tarihi</label>
                {adminForm.durationType === "full_day" ? (
                  <>
                    <input type="date" value={adminForm.end} onChange={(e) => updateAdminField("end", e.target.value)} style={{ width: "100%", ...adminErrStyle("end") }} />
                    {adminErrors.end && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{adminErrors.end}</p>}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "8px 0 0" }}>Yarım gün — tek tarih (0,5 gün)</p>
                )}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Başlangıç saati <span style={{ color: "var(--color-text-tertiary)" }}>(opsiyonel)</span></label>
                <input type="time" value={adminForm.startTime} onChange={(e) => updateAdminField("startTime", e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Bitiş saati <span style={{ color: "var(--color-text-tertiary)" }}>(opsiyonel)</span></label>
                <input type="time" value={adminForm.endTime} onChange={(e) => updateAdminField("endTime", e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>İzin geçirilecek yer <span style={{ color: "var(--color-text-tertiary)" }}>(opsiyonel)</span></label>
                <input type="text" value={adminForm.location} onChange={(e) => updateAdminField("location", e.target.value)} placeholder="Örn. İzmir"
                  style={{ width: "100%", fontFamily: "inherit", fontSize: 14, padding: "6px 10px", borderRadius: "var(--border-radius-md)", border: "1px solid var(--color-border-secondary)", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Ulaşılabilecek telefon <span style={{ color: "var(--color-text-tertiary)" }}>(opsiyonel)</span></label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="text" list="ulke-kodlari-admin" value={adminForm.countryCode} onChange={(e) => updateAdminField("countryCode", e.target.value)} aria-label="Ülke kodu"
                    style={{ width: 78, flexShrink: 0, fontFamily: "inherit", fontSize: 14, padding: "6px 8px", borderRadius: "var(--border-radius-md)", border: `1px solid ${adminErrors.contactPhone ? ERR_COLOR : "var(--color-border-secondary)"}`, boxSizing: "border-box" }} />
                  <input type="tel" value={adminForm.contactPhone} onChange={(e) => updateAdminField("contactPhone", e.target.value)} placeholder="5xx xxx xx xx"
                    style={{ flex: 1, minWidth: 0, fontFamily: "inherit", fontSize: 14, padding: "6px 10px", borderRadius: "var(--border-radius-md)", border: `1px solid ${adminErrors.contactPhone ? ERR_COLOR : "var(--color-border-secondary)"}`, boxSizing: "border-box" }} />
                  <datalist id="ulke-kodlari-admin">
                    <option value="+90">Türkiye</option>
                    <option value="+1">ABD / Kanada</option>
                    <option value="+44">Birleşik Krallık</option>
                    <option value="+49">Almanya</option>
                    <option value="+31">Hollanda</option>
                  </datalist>
                </div>
                {adminErrors.contactPhone && <p style={{ color: ERR_COLOR, fontSize: 12, margin: "4px 0 0" }}>{adminErrors.contactPhone}</p>}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Açıklama <span style={{ color: "var(--color-text-tertiary)" }}>(opsiyonel)</span></label>
              <textarea value={adminForm.reason} onChange={(e) => updateAdminField("reason", e.target.value)} rows={3}
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "1px solid var(--color-border-secondary)" }}
                placeholder="Örn. yıllık izin (yönetici tarafından girildi)" />
            </div>

            <button type="submit" className="ev-btn-primary" disabled={adminSubmitting}>
              <i className="ti ti-user-plus" style={{ fontSize: 15 }} aria-hidden="true"></i>
              {adminSubmitting ? "Kaydediliyor…" : "Kaydı oluştur (onaylı)"}
            </button>
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "10px 0 0" }}>
              Bu kayıt otomatik olarak <strong>onaylı</strong> eklenir ve çalışanın kullanılan izin günlerine dahil edilir.
            </p>
          </form>
        </div>
      )}

      {/* ---- Çalışanlar (yönetici) ---- */}
      {view === "calisanlar" && role === "yonetici" && (() => {
        const fmt = (n) => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
        const th = { textAlign: "left", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", padding: "10px 14px", borderBottom: "1px solid var(--color-border-tertiary)", whiteSpace: "nowrap" };
        const td = { fontSize: 14, padding: "11px 14px", borderBottom: "1px solid var(--color-border-tertiary)", whiteSpace: "nowrap" };
        const numTd = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
        return (
          <div className="ev-card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={th}>Çalışan</th>
                  <th style={th}>İşe giriş</th>
                  <th style={{ ...th, textAlign: "right" }}>Hak edilen</th>
                  <th style={{ ...th, textAlign: "right" }}>Kullanılan</th>
                  <th style={{ ...th, textAlign: "right" }}>Kalan</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td style={{ ...td, color: "var(--color-text-tertiary)" }} colSpan={5}>Çalışan bulunamadı.</td></tr>
                ) : (
                  employees.map((e) => {
                    const earned = Number(e.totalEarned ?? e.balance ?? 0);
                    const used = Number(e.usedLeave ?? 0);
                    const remaining = Number(e.remainingLeave ?? (earned - used));
                    return (
                      <tr key={e.id}>
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar user={e} size={28} />
                            <span style={{ fontWeight: 500 }}>{e.name}</span>
                            {e.role === "yonetici" && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 999, background: "var(--accent-bg)", color: "var(--accent)" }}>Yönetici</span>}
                          </div>
                        </td>
                        <td style={{ ...td, color: "var(--color-text-secondary)" }}>{e.hireDate ? formatDate(e.hireDate) : "—"}</td>
                        <td style={numTd}>{fmt(earned)}</td>
                        <td style={numTd}>{fmt(used)}</td>
                        <td style={{ ...numTd, fontWeight: 600, color: remaining < 0 ? "var(--color-text-danger)" : "var(--color-text-primary)" }}>{fmt(remaining)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

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
                  {events.slice(0, calMax).map((ev, idx) => (
                    <span key={idx} title={`${ev.name} · ${LEAVE_TYPES[ev.type]?.label || ev.type}${isHalfDay(ev.durationType) ? " · yarım gün" : ""}`}
                      style={{
                        fontSize: 11, padding: "1px 6px", borderRadius: "var(--border-radius-md)",
                        background: ev.color || "#E6F1FB", color: "#23202b", fontWeight: 500,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        display: "flex", alignItems: "center", gap: 3
                      }}>
                      {ev.initials}{isHalfDay(ev.durationType) && <span style={{ fontSize: 9, fontWeight: 700 }}>½</span>}
                    </span>
                  ))}
                  {events.length > calMax && (
                    <button onClick={() => setDayModal({ day, entries: events })}
                      style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", padding: "1px 4px", textAlign: "left", cursor: "pointer", fontWeight: 500 }}>
                      +{events.length - calMax} daha
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {(() => {
            const m = new Map();
            Object.values(calendarData).forEach((list) => list.forEach((ev) => { if (!m.has(ev.name)) m.set(ev.name, ev.color); }));
            const emps = Array.from(m, ([name, color]) => ({ name, color }));
            return (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {emps.length > 0 && (
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {emps.map((e) => (
                      <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
                        <span style={{ width: 12, height: 12, borderRadius: 4, background: e.color, border: "1px solid var(--color-border-secondary)" }}></span>
                        {e.name}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>½ = yarım gün</div>
              </div>
            );
          })()}
        </div>
      )}

      {dayModal && (
        <div onClick={() => setDayModal(null)} role="dialog" aria-modal="true" aria-label="Gün izin detayı"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--color-background-primary)", color: "var(--color-text-primary)", borderRadius: 14, border: "1px solid var(--color-border-tertiary)", maxWidth: 440, width: "100%", maxHeight: "80vh", overflowY: "auto", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{dayModal.day} {MONTH_NAMES[calendarMonth - 1]} {calendarYear} — izinler</h3>
              <button onClick={() => setDayModal(null)} aria-label="Kapat"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dayModal.entries.map((ev, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "var(--color-background-secondary)" }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: ev.color, flexShrink: 0 }}></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{ev.name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span>{LEAVE_TYPES[ev.type]?.label || ev.type}</span>
                      {isHalfDay(ev.durationType) && <span>· {ev.durationType === "half_day_morning" ? "Yarım gün (sabah)" : "Yarım gün (öğleden sonra)"}</span>}
                      {(ev.startTime || ev.endTime) && <span>· {ev.startTime || "?"}–{ev.endTime || "?"}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--color-background-success)", color: "var(--color-text-success)", whiteSpace: "nowrap" }}>Onaylı</span>
                </div>
              ))}
            </div>
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
