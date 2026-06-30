-- db-merge-duplicates.sql
-- Google ile giriş, isim eşleşmesi Türkçe karakter farkı (I/ı) yüzünden bozulduğunda
-- ikinci (mükerrer) çalışan kaydı oluşturmuştu. Bu script, Google'a bağlı YENİ kaydı,
-- aynı isimli (Türkçe-normalize) eski/seed kaydıyla BİRLEŞTİRİR:
--   * eski kaydın izin bakiyesi, işe giriş tarihi ve geçmiş talepleri korunur,
--   * Google kimliği (google_id), e-posta ve avatar eski kayda taşınır,
--   * mükerrer yeni kayıt silinir.
-- Idempotent: birleştirilecek çift kalmadığında hiçbir şey yapmaz.
--
-- Çalıştırma (Cloud SQL):
--   gcloud sql connect izin-db --user=postgres --database=izin
--   \i db-merge-duplicates.sql      (veya içeriği yapıştır)

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.id  AS new_id,
      o.id  AS old_id,
      n.google_id,
      n.email,
      n.avatar_url,
      n.initials
    FROM employees n
    JOIN employees o
      ON o.id <> n.id
     AND o.google_id IS NULL                       -- eski kayıt henüz Google'a bağlanmamış
     AND upper(translate(o.name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU'))
       = upper(translate(n.name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU'))   -- isimler (normalize) aynı
    WHERE n.google_id IS NOT NULL                  -- yeni kayıt Google'a bağlı
  LOOP
    RAISE NOTICE 'Birleştiriliyor: yeni=%  ->  eski=%', r.new_id, r.old_id;

    -- 1) Yeni kaydın talep ve admin referanslarını eski kayda taşı
    UPDATE leave_requests SET user_id = r.old_id WHERE user_id = r.new_id;
    UPDATE leave_requests SET created_by_admin_id = r.old_id WHERE created_by_admin_id = r.new_id;

    -- 2) Mükerrer yeni kaydı sil (google_id benzersiz index'i serbest kalsın)
    DELETE FROM employees WHERE id = r.new_id;

    -- 3) Google kimliğini ve profili eski kayda taşı (eski e-posta varsa korunur)
    UPDATE employees
       SET google_id  = r.google_id,
           email      = COALESCE(email, r.email),
           avatar_url = COALESCE(r.avatar_url, avatar_url),
           initials   = COALESCE(initials, r.initials)
     WHERE id = r.old_id;
  END LOOP;
END $$;

-- Kontrol: aynı isimli (normalize) birden fazla kayıt kaldı mı?
SELECT upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) AS ad_anahtari,
       count(*) AS kayit_sayisi,
       array_agg(id) AS idler
FROM employees
GROUP BY 1
HAVING count(*) > 1
ORDER BY 1;
