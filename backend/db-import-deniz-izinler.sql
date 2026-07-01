-- db-import-deniz-izinler.sql
-- Deniz Katırcıoğlu izinleri (SmartAlpha_Personel_İzin_2026.xlsx -> "Deniz Katırcıoğlu Öztürk").
-- 7 kayıt | yıllık 18.5 + mazeret 0. Tümü "onaylandı".
-- Eşleştirme: adı "DENIZ KATIRCIOGLU" ile BAŞLAYAN kayıt (sayfa adında 'Öztürk' var, sistemde olmayabilir).
-- Idempotent: yalnızca source='import' kayıtları silinip yeniden eklenir.
-- Çalıştırma: gcloud sql connect izin-db --user=postgres --database=izin -> \i db-import-deniz-izinler.sql

DO $$
DECLARE emp_id TEXT; cnt INT;
BEGIN
  SELECT count(*) INTO cnt FROM employees
   WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) LIKE 'DENIZ KATIRCIOGLU%';
  IF cnt = 0 THEN RAISE EXCEPTION 'Deniz Katırcıoğlu kaydı bulunamadı.'; END IF;
  IF cnt > 1 THEN RAISE EXCEPTION 'Birden fazla "Deniz Katırcıoğlu" kaydı var (%) - elle id ile girin.', cnt; END IF;

  SELECT id INTO emp_id FROM employees
   WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) LIKE 'DENIZ KATIRCIOGLU%'
   LIMIT 1;

  DELETE FROM leave_requests WHERE user_id = emp_id AND source='import';
  INSERT INTO leave_requests
    (user_id, type, start_date, end_date, days, status, duration_type, source, reason, created_at)
  SELECT emp_id, v.type, v.sd::date, v.ed::date, v.days, 'onaylandi', v.dur, 'import', v.reason, v.ed::timestamptz
  FROM (VALUES
    ('yillik','2026-06-17','2026-06-17',0.5,'half_day',NULL),
    ('yillik','2026-05-25','2026-05-26',1.5,'full_day',NULL),
    ('yillik','2026-03-19','2026-03-19',0.5,'half_day',NULL),
    ('yillik','2026-02-19','2026-02-20',2.0,'full_day',NULL),
    ('yillik','2026-01-14','2026-01-16',3.0,'full_day',NULL),
    ('yillik','2025-11-21','2025-11-24',3.0,'full_day',NULL),
    ('yillik','2025-09-03','2025-09-12',8.0,'full_day',NULL)
  ) AS v(type, sd, ed, days, dur, reason);
  RAISE NOTICE 'Deniz (%): % kayıt eklendi.', emp_id, 7;
END $$;

-- Kontrol
SELECT e.name, lr.type, count(*) adet, SUM(lr.days) gun
FROM leave_requests lr JOIN employees e ON e.id=lr.user_id
WHERE lr.source='import'
  AND upper(translate(e.name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) LIKE 'DENIZ KATIRCIOGLU%'
GROUP BY e.name, lr.type ORDER BY lr.type;
