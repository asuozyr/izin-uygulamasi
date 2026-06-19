import React, { useState, useEffect, useMemo, useCallback } from "react";

// Backend API base URL. In production this should be the same origin
// (Cloud Run serves both frontend and backend), so an empty string works.
// During local development you can set this to "http://localhost:8080".
const API_BASE = "";

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

function diffDays(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const d = Math.round((e - s) / 86400000) + 1;
  return d > 0 ? d : 1;
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

// ---------------------------------------------------------------------
// API helper functions
// All endpoints are expected to be implemented by the backend (Express).
// Each function throws on non-2xx responses so callers can show errors.
// ---------------------------------------------------------------------
async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch (_) {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  // GET /api/employees -> [{ id, name, initials, balance }]
  getEmployees: () => apiRequest("/api/employees"),

  // GET /api/requests?userId=...   (userId optional - omit for manager "all")
  getRequests: (userId) =>
    apiRequest(`/api/requests${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`),

  // POST /api/requests  body: { userId, type, start, end, days, reason }
  createRequest: (payload) =>
    apiRequest("/api/requests", { method: "POST", body: JSON.stringify(payload) }),

  // PATCH /api/requests/:id  body: { status }
  updateRequestStatus: (id, status) =>
    apiRequest(`/api/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // GET /api/calendar?year=2026&month=6 -> { "12": [{ name, initials, type }], ... }
  getCalendar: (year, month) => apiRequest(`/api/calendar?year=${year}&month=${month}`),
};

export default function LeaveApp() {
  const [role, setRole] = useState("calisan");
  const [currentUserId, setCurrentUserId] = useState("");
  const [view, setView] = useState("yenitalep");

  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);
  const [calendarData, setCalendarData] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [form, setForm] = useState({ type: "yillik", start: "", end: "", reason: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const calendarYear = 2026;
  const calendarMonth = 6; // June, 1-indexed for the API

  // ---- Initial load: employees ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .getEmployees()
      .then((data) => {
        if (cancelled) return;
        setEmployees(data);
        if (data.length > 0) setCurrentUserId(data[0].id);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Load requests whenever role / user / view changes ----
  const refreshRequests = useCallback(() => {
    if (!currentUserId) return;
    setError("");
    const userIdParam = role === "calisan" ? currentUserId : undefined;
    api
      .getRequests(userIdParam)
      .then(setRequests)
      .catch((err) => setError(err.message));
  }, [role, currentUserId]);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  // ---- Load calendar when that view is opened ----
  useEffect(() => {
    if (view !== "takvim") return;
    setError("");
    api
      .getCalendar(calendarYear, calendarMonth)
      .then(setCalendarData)
      .catch((err) => setError(err.message));
  }, [view]);

  const currentUser = employees.find((e) => e.id === currentUserId);

  const myRequests = useMemo(
    () =>
      requests
        .filter((r) => r.userId === currentUserId)
        .slice()
        .sort((a, b) => b.id - a.id),
    [requests, currentUserId]
  );

  const usedDays = useMemo(
    () =>
      requests
        .filter((r) => r.userId === currentUserId && r.type === "yillik" && r.status !== "reddedildi")
        .reduce((sum, r) => sum + r.days, 0),
    [requests, currentUserId]
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
    const days = diffDays(form.start, form.end);
    setSubmitting(true);
    try {
      await api.createRequest({
        userId: currentUserId,
        type: form.type,
        start: form.start,
        end: form.end,
        days,
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
      await api.updateRequestStatus(id, decision);
      refreshRequests();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function cancelRequest(id) {
    setActionError("");
    try {
      await api.updateRequestStatus(id, "reddedildi");
      refreshRequests();
    } catch (err) {
      setActionError(err.message);
    }
  }

  // ---- Calendar grid setup ----
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

  function switchRole(newRole) {
    setRole(newRole);
    setView(newRole === "calisan" ? "yenitalep" : "onaylar");
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-secondary)", padding: "2rem 0", textAlign: "center" }}>
        Yükleniyor...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-primary)", maxWidth: 720, margin: "0 auto" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0 }}>İzin yönetimi</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Veriler API üzerinden sunucudan geliyor
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select value={role} onChange={(e) => switchRole(e.target.value)} style={{ width: 140 }}>
            <option value="calisan">Çalışan</option>
            <option value="yonetici">Yönetici</option>
          </select>
          {role === "calisan" && (
            <select value={currentUserId} onChange={(e) => setCurrentUserId(e.target.value)} style={{ width: 160 }}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          )}
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
          Sunucuya bağlanırken bir sorun oluştu: {error}
        </div>
      )}

      {/* User summary card (employee only) */}
      {role === "calisan" && currentUser && (
        <div style={{
          display: "flex", alignItems: "center", gap: "16px",
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "1rem 1.25rem", marginBottom: "1.5rem"
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "var(--color-background-info)", color: "var(--color-text-info)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 500, fontSize: 14, flexShrink: 0
          }}>
            {currentUser.initials}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 15 }}>{currentUser.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>Çalışan</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Yıllık hak</div>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{currentUser.balance}</div>
            </div>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Kullanılan</div>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{usedDays}</div>
            </div>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Kalan</div>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{Math.max(0, currentUser.balance - usedDays)}</div>
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
              background: view === item.id ? "var(--color-background-secondary)" : "transparent",
              borderRadius: "var(--border-radius-md)",
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: view === item.id ? 500 : 400,
              cursor: "pointer",
              color: "var(--color-text-primary)",
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
            <button type="submit" disabled={submitting} style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                <span style={{ fontSize: 14 }}>{r.start} – {r.end}</span>
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
            const user = employees.find((u) => u.id === r.userId);
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
                  }}>{user?.initials ?? "?"}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{user?.name ?? "Bilinmeyen kullanıcı"}</div>
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                      {LEAVE_TYPES[r.type].label} · {r.start} – {r.end} ({r.days} gün)
                      {r.reason && <> · {r.reason}</>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => decide(r.id, "onaylandi")} style={{ fontSize: 13, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4 }}>
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
            const user = employees.find((u) => u.id === r.userId);
            return (
              <div key={r.id} style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{user?.name ?? "Bilinmeyen kullanıcı"}</span>
                  <ColorBadge text={LEAVE_TYPES[r.type].label} ramp={LEAVE_TYPES[r.type].color} />
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{r.start} – {r.end} ({r.days} gün)</span>
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
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Haziran 2026</p>
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
