-- db-import-safa-izinler.sql
-- Safa Emre Yıldırım'ın geçmiş izinleri (SmartAlpha_Personel_İzin_2026.xlsx -> "Safa Emre Yıldırım" sayfası).
-- 26 kayıt. Yıllık 54.0 gün + mazeret 2.0 gün. Tümü "onaylandı".
-- Idempotent: yalnızca source='import' kayıtlarını siler, sonra yeniden ekler. Mevcut gerçek talepler etkilenmez.
-- Çalıştırma: gcloud sql connect izin-db --user=postgres --database=izin  ->  \i db-import-safa-izinler.sql

DO $$
DECLARE
  emp_id TEXT;
BEGIN
  SELECT id INTO emp_id FROM employees
   WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'SAFA EMRE YILDIRIM'
   ORDER BY (google_id IS NOT NULL) DESC, hire_date NULLS LAST
   LIMIT 1;

  IF emp_id IS NULL THEN
    RAISE EXCEPTION 'Safa Emre Yıldırım çalışan kaydı bulunamadı.';
  END IF;

  -- Önceki içe aktarımı temizle (idempotent)
  DELETE FROM leave_requests WHERE user_id = emp_id AND source = 'import';

  INSERT INTO leave_requests
    (user_id, type, start_date, end_date, days, status, duration_type, source, reason, created_at)
  SELECT emp_id, v.type, v.sd::date, v.ed::date, v.days, 'onaylandi', v.dur, 'import', v.reason, v.ed::timestamptz
  FROM (VALUES
  ('yillik','2026-06-22','2026-06-22',1.0,'full_day',NULL),
  ('yillik','2026-06-08','2026-06-12',5.0,'full_day',NULL),
  ('yillik','2026-06-05','2026-06-05',1.0,'full_day',NULL),
  ('yillik','2026-05-25','2026-05-26',1.5,'full_day',NULL),
  ('yillik','2026-03-27','2026-03-27',0.5,'half_day',NULL),
  ('yillik','2026-03-19','2026-03-19',0.5,'half_day',NULL),
  ('yillik','2026-03-06','2026-03-06',1.0,'full_day',NULL),
  ('mazeret','2026-02-12','2026-02-13',2.0,'full_day',NULL),
  ('yillik','2026-01-02','2026-01-02',1.0,'full_day',NULL),
  ('yillik','2025-07-07','2025-07-11',5.0,'full_day',NULL),
  ('yillik','2025-05-02','2025-05-02',1.0,'full_day',NULL),
  ('yillik','2025-03-03','2025-03-07',5.0,'full_day',NULL),
  ('yillik','2024-10-30','2024-11-01',3.0,'full_day',NULL),
  ('yillik','2024-10-28','2024-10-28',0.5,'half_day',NULL),
  ('yillik','2024-09-25','2024-09-27',3.0,'full_day',NULL),
  ('yillik','2024-07-02','2024-07-02',1.0,'full_day',NULL),
  ('yillik','2024-06-20','2024-06-21',2.0,'full_day','kurban bayramı 2 gün birleştirme'),
  ('yillik','2024-04-08','2024-04-09',1.5,'full_day','ramazan bayramı 1,5 gün birleştirme'),
  ('yillik','2024-02-19','2024-02-21',3.0,'full_day',NULL),
  ('yillik','2023-09-25','2023-09-29',5.0,'full_day',NULL),
  ('yillik','2023-09-08','2023-09-08',1.0,'full_day',NULL),
  ('yillik','2023-06-26','2023-06-27',1.5,'full_day',NULL),
  ('yillik','2023-03-13','2023-03-13',1.0,'full_day',NULL),
  ('yillik','2023-01-30','2023-02-03',5.0,'full_day',NULL),
  ('yillik','2022-08-31','2022-09-02',3.0,'full_day',NULL),
  ('yillik','2022-08-29','2022-08-29',1.0,'full_day',NULL)
  ) AS v(type, sd, ed, days, dur, reason);

  RAISE NOTICE 'Safa (% ) için % kayıt eklendi.', emp_id, 26;
END $$;

-- Kontrol
SELECT type, count(*) AS adet, SUM(days) AS gun
FROM leave_requests
WHERE user_id = (SELECT id FROM employees
                 WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU'))='SAFA EMRE YILDIRIM'
                 ORDER BY (google_id IS NOT NULL) DESC, hire_date NULLS LAST LIMIT 1)
  AND source='import'
GROUP BY type ORDER BY type;
