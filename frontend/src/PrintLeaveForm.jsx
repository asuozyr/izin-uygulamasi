import { useEffect, useState } from "react";
import logo from "./assets/logo.png";

const TOKEN_KEY = "izin_token";

const TYPE_BOXES = [
  ["yillik", "Yıllık"],
  ["olum", "Ölüm"],
  ["evlilik", "Evlilik"],
  ["ucretsiz", "Ücretsiz"],
  ["mazeret", "Mazeret"],
  ["hastalik", "Hastalık"],
];
const DURATION_LABEL = {
  full_day: "Tam gün",
  half_day: "Yarım gün",
  custom: "Saatli (kendi girişi)",
};

function formatDate(iso) {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "—";
  return `${d}.${m}.${y}`;
}
function fmtDays(n) {
  return Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

export default function PrintLeaveForm({ id }) {
  const [req, setReq] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setError("Bu formu görüntülemek için giriş yapmış olmalısınız.");
      setLoading(false);
      return;
    }
    fetch(`/api/leave-requests/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `İstek başarısız (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setReq(data);
        document.title = `İzin Formu #${data.id} — ${data.employeeName || ""}`.trim();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ fontFamily: "system-ui, sans-serif", padding: 40, textAlign: "center", color: "#444" }}>Yükleniyor…</div>;
  }
  if (error) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 40, textAlign: "center", color: "#444" }}>
        <p>{error}</p>
        <button onClick={() => (window.location.href = "/")} style={{ marginTop: 12 }}>Ana sayfaya dön</button>
      </div>
    );
  }

  if (req && req.status !== "onaylandi") {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 40, textAlign: "center", color: "#444" }}>
        <p>Bu form yalnızca <strong>onaylanan</strong> izinler için oluşturulabilir.</p>
        <button onClick={() => window.close()} style={{ marginTop: 12 }}>Kapat</button>
      </div>
    );
  }

  const timeRange =
    req.startTime || req.endTime ? `${req.startTime || "—"} – ${req.endTime || "—"}` : "—";

  return (
    <div className="pf-root">
      <style>{PRINT_CSS}</style>

      <div className="pf-actions">
        <button className="pf-btn pf-btn-primary" onClick={() => window.print()}>Yazdır / PDF olarak kaydet</button>
        <button className="pf-btn" onClick={() => window.close()}>Kapat</button>
      </div>

      <div className="pf-sheet">
        {/* Başlık */}
        <header className="pf-head">
          <img src={logo} alt="SmartAlpha" className="pf-logo" />
          <div className="pf-title-wrap">
            <h1 className="pf-title">İzin Kullanma Formu</h1>
            <div className="pf-sub">Smart Alfa Teknoloji San. ve Tic. A.Ş.</div>
          </div>
          <div className="pf-recno">
            <div className="pf-recno-lbl">Kayıt No</div>
            <div className="pf-recno-val">#{req.id}</div>
          </div>
        </header>

        {/* Çalışan bilgileri */}
        <table className="pf-table">
          <tbody>
            <tr>
              <th className="pf-th">Ad Soyad</th>
              <td className="pf-td">{req.employeeName || ""}</td>
              <th className="pf-th">T.C. Kimlik No</th>
              <td className="pf-td"></td>
            </tr>
            <tr>
              <th className="pf-th">Talep Tarihi</th>
              <td className="pf-td" colSpan={3}>{formatDate(req.createdAt)}</td>
            </tr>
          </tbody>
        </table>

        {/* İzin türü */}
        <div className="pf-section-lbl">İzin Türü</div>
        <div className="pf-types">
          {TYPE_BOXES.map(([key, label]) => (
            <label key={key} className="pf-type">
              <span className="pf-check">{req.type === key ? "X" : ""}</span>
              {label}
            </label>
          ))}
        </div>

        {/* İzin detayları */}
        <table className="pf-table">
          <tbody>
            <tr>
              <th className="pf-th">İzin Başlangıç Tarihi</th>
              <td className="pf-td">{formatDate(req.start)}</td>
              <th className="pf-th">İzin Bitiş Tarihi</th>
              <td className="pf-td">{formatDate(req.end)}</td>
            </tr>
            <tr>
              <th className="pf-th">Saat (Başl. – Bitiş)</th>
              <td className="pf-td">{timeRange}</td>
              <th className="pf-th">İzin Süresi</th>
              <td className="pf-td">{DURATION_LABEL[req.durationType] || "Tam gün"}</td>
            </tr>
            <tr>
              <th className="pf-th">Çalışmaya Başlanacak Tarih</th>
              <td className="pf-td">{formatDate(req.returnDate)}</td>
              <th className="pf-th">Toplam İzin Günü</th>
              <td className="pf-td"><strong>{fmtDays(req.days)} gün</strong></td>
            </tr>
            <tr>
              <th className="pf-th">Ulaşılabilecek Telefon</th>
              <td className="pf-td" colSpan={3}>{req.contactPhone || ""}</td>
            </tr>
          </tbody>
        </table>

        {/* İzin sebebi / açıklama */}
        <div className="pf-section-lbl">İzin Sebebi / Açıklama</div>
        <div className="pf-box pf-box-tall">{req.reason || ""}</div>

        {/* Beyan */}
        <p className="pf-decl">
          Yukarıda belirttiğim tarihler arasında izin kullanmak istiyorum. Verdiğim bilgilerin doğru olduğunu
          beyan ederim. İzin dönüşü göreve zamanında başlayacağımı taahhüt ederim.
        </p>

        {/* İmza alanları kaldırıldı */}

        {/* İzin dönüşü kullanım beyanı */}
        <div className="pf-section-lbl">İzin Dönüşü Kullanım Beyanı</div>
        <div className="pf-box pf-box-return">
          <p className="pf-return-txt">
            İzin dönüşü göreve başladığımı, izni belirtilen tarihlerde kullandığımı beyan ederim.
          </p>
          <div className="pf-return-grid">
            <div className="pf-sign-line">Göreve Başlama Tarihi: ............................</div>
            <div className="pf-sign-line">Çalışan İmza: ............................</div>
          </div>
        </div>

        <footer className="pf-foot">SmartAlpha — İzin Kullanma Formu · Kayıt No #{req.id}</footer>
      </div>
    </div>
  );
}

function statusLabel(s) {
  return { beklemede: "Beklemede", onaylandi: "Onaylandı", reddedildi: "Reddedildi", iptal: "İptal" }[s] || s;
}

const PRINT_CSS = `
.pf-root { background: #6b7280; min-height: 100vh; padding: 24px 0; font-family: "Times New Roman", Georgia, serif; color: #111; }
.pf-actions { max-width: 210mm; margin: 0 auto 16px; display: flex; gap: 10px; justify-content: flex-end; padding: 0 8px; }
.pf-btn { font-family: system-ui, sans-serif; font-size: 14px; padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; color: #1f2937; cursor: pointer; }
.pf-btn-primary { background: #6F03B5; border-color: #6F03B5; color: #fff; font-weight: 600; }
.pf-btn:hover { filter: brightness(0.97); }

.pf-sheet { width: 210mm; min-height: 297mm; box-sizing: border-box; margin: 0 auto; background: #fff; padding: 16mm 16mm 14mm; box-shadow: 0 2px 12px rgba(0,0,0,.3); }

.pf-head { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
.pf-logo { height: 34px; width: auto; object-fit: contain; }
.pf-title-wrap { flex: 1; text-align: center; }
.pf-title { font-size: 19px; margin: 0; letter-spacing: .3px; text-transform: uppercase; }
.pf-sub { font-size: 11px; color: #444; margin-top: 2px; font-family: system-ui, sans-serif; letter-spacing: 1px; }
.pf-recno { border: 1px solid #111; min-width: 92px; text-align: center; }
.pf-recno-lbl { font-size: 10px; background: #eee; border-bottom: 1px solid #111; padding: 2px 6px; font-family: system-ui, sans-serif; }
.pf-recno-val { font-size: 14px; font-weight: 700; padding: 4px 6px; }

.pf-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.pf-th, .pf-td { border: 1px solid #111; padding: 6px 8px; font-size: 12.5px; vertical-align: top; }
.pf-th { background: #f0f0f0; text-align: left; width: 22%; font-weight: 700; }
.pf-td { width: 28%; }

.pf-section-lbl { font-size: 12.5px; font-weight: 700; background: #111; color: #fff; padding: 4px 8px; margin-bottom: 0; }
.pf-types { display: flex; flex-wrap: wrap; gap: 6px 18px; border: 1px solid #111; border-top: 0; padding: 8px 10px; margin-bottom: 12px; }
.pf-type { display: flex; align-items: center; gap: 6px; font-size: 12.5px; }
.pf-check { display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; border: 1px solid #111; font-size: 11px; font-weight: 700; font-family: system-ui, sans-serif; }

.pf-box { border: 1px solid #111; border-top: 0; padding: 8px 10px; font-size: 12.5px; margin-bottom: 12px; white-space: pre-wrap; }
.pf-box-tall { min-height: 48px; }
.pf-box-return { border-top: 0; }
.pf-return-txt { margin: 0 0 10px; font-size: 12.5px; }
.pf-return-grid { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }

.pf-decl { font-size: 12px; line-height: 1.5; margin: 12px 0; }

.pf-sign th { text-align: center; }
.pf-sign-cell { height: 92px; width: 50%; }
.pf-sign-line { font-size: 12.5px; margin-bottom: 8px; }
.pf-sign-imza { margin-top: 18px; }

.pf-foot { margin-top: 14px; border-top: 1px solid #999; padding-top: 6px; font-size: 10px; color: #555; text-align: center; font-family: system-ui, sans-serif; }

@page { size: A4 portrait; margin: 12mm; }
@media print {
  .pf-root { background: #fff; padding: 0; }
  .pf-actions { display: none !important; }
  .pf-sheet { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
  .pf-section-lbl { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pf-th, .pf-recno-lbl { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
