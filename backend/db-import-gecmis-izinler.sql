-- db-import-gecmis-izinler.sql
-- 6 çalışanın geçmiş izinleri (SmartAlpha_Personel_İzin_2026.xlsx).
-- Tümü "onaylandı". Idempotent: her çalışan için yalnızca source='import' kayıtları silinip yeniden eklenir.
-- Ayhan Okuyan'daki "Cenaze" satırı 'mazeret' (reason='Cenaze izni') olarak girilmiştir.
-- Çalıştırma: gcloud sql connect izin-db --user=postgres --database=izin  ->  \i db-import-gecmis-izinler.sql

-- ===== Cem Volkan Doğan (22 kayıt | yıllık 49.0 + mazeret 0) =====
DO $$
DECLARE emp_id TEXT;
BEGIN
  SELECT id INTO emp_id FROM employees
   WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'CEM VOLKAN DOGAN'
   ORDER BY (google_id IS NOT NULL) DESC, hire_date NULLS LAST LIMIT 1;
  IF emp_id IS NULL THEN RAISE EXCEPTION 'Cem Volkan Doğan çalışan kaydı bulunamadı.'; END IF;
  DELETE FROM leave_requests WHERE user_id = emp_id AND source = 'import';
  INSERT INTO leave_requests
    (user_id, type, start_date, end_date, days, status, duration_type, source, reason, created_at)
  SELECT emp_id, v.type, v.sd::date, v.ed::date, v.days, 'onaylandi', v.dur, 'import', v.reason, v.ed::timestamptz
  FROM (VALUES
    ('yillik','2026-06-01','2026-06-05',5.0,'full_day',NULL),
    ('yillik','2026-05-25','2026-05-26',1.5,'full_day',NULL),
    ('yillik','2026-01-02','2026-01-02',1.0,'full_day',NULL),
    ('yillik','2025-11-21','2025-12-05',10.0,'full_day',NULL),
    ('yillik','2025-10-10','2025-10-10',1.0,'full_day',NULL),
    ('yillik','2025-07-14','2025-07-14',1.0,'full_day',NULL),
    ('yillik','2025-04-21','2025-04-24',3.0,'full_day',NULL),
    ('yillik','2025-03-03','2025-03-05',3.0,'full_day',NULL),
    ('yillik','2025-02-25','2025-02-25',1.0,'full_day',NULL),
    ('yillik','2024-12-20','2024-12-20',1.0,'full_day',NULL),
    ('yillik','2024-10-28','2024-10-28',0.5,'half_day',NULL),
    ('yillik','2024-09-20','2024-09-20',1.0,'full_day',NULL),
    ('yillik','2024-08-29','2024-08-29',1.0,'full_day',NULL),
    ('yillik','2024-06-20','2024-06-21',2.0,'full_day','kurban bayramı 2 gün birleştirme'),
    ('yillik','2024-05-16','2024-05-17',2.0,'full_day',NULL),
    ('yillik','2024-04-08','2024-04-09',1.5,'full_day','ramazan bayramı 1,5 gün birleştirme'),
    ('yillik','2024-02-02','2024-02-02',1.0,'full_day',NULL),
    ('yillik','2023-09-29','2023-10-02',2.0,'full_day',NULL),
    ('yillik','2023-08-14','2023-08-18',5.0,'full_day',NULL),
    ('yillik','2023-06-26','2023-06-27',1.5,'full_day',NULL),
    ('yillik','2023-03-31','2023-03-31',1.0,'full_day',NULL),
    ('yillik','2022-08-17','2022-08-19',3.0,'full_day',NULL)
  ) AS v(type, sd, ed, days, dur, reason);
  RAISE NOTICE 'Cem Volkan Doğan: % kayıt', (SELECT count(*) FROM leave_requests WHERE user_id=emp_id AND source='import');
END $$;

-- ===== Senanur Samur Duysal (15 kayıt | yıllık 29.5 + mazeret 0) =====
DO $$
DECLARE emp_id TEXT;
BEGIN
  SELECT id INTO emp_id FROM employees
   WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'SENANUR SAMUR DUYSAL'
   ORDER BY (google_id IS NOT NULL) DESC, hire_date NULLS LAST LIMIT 1;
  IF emp_id IS NULL THEN RAISE EXCEPTION 'Senanur Samur Duysal çalışan kaydı bulunamadı.'; END IF;
  DELETE FROM leave_requests WHERE user_id = emp_id AND source = 'import';
  INSERT INTO leave_requests
    (user_id, type, start_date, end_date, days, status, duration_type, source, reason, created_at)
  SELECT emp_id, v.type, v.sd::date, v.ed::date, v.days, 'onaylandi', v.dur, 'import', v.reason, v.ed::timestamptz
  FROM (VALUES
    ('yillik','2026-05-25','2026-05-26',1.5,'full_day',NULL),
    ('yillik','2026-03-19','2026-03-19',0.5,'half_day',NULL),
    ('yillik','2026-04-20','2026-04-24',4.0,'full_day',NULL),
    ('yillik','2026-02-25','2026-02-25',0.5,'half_day',NULL),
    ('yillik','2026-01-02','2026-01-02',1.0,'full_day',NULL),
    ('yillik','2025-11-10','2025-11-10',1.0,'full_day',NULL),
    ('yillik','2024-07-22','2024-07-24',3.0,'full_day',NULL),
    ('yillik','2024-04-08','2024-04-09',1.5,'full_day','ramazan bayramı 1,5 gün birleştirme'),
    ('yillik','2024-02-15','2024-02-15',1.0,'full_day',NULL),
    ('yillik','2024-02-02','2024-02-02',1.0,'full_day',NULL),
    ('yillik','2023-09-25','2023-09-29',5.0,'full_day',NULL),
    ('yillik','2023-06-22','2023-06-27',3.5,'full_day',NULL),
    ('yillik','2023-04-10','2023-04-10',1.0,'full_day',NULL),
    ('yillik','2022-07-13','2022-07-14',2.0,'full_day',NULL),
    ('yillik','2022-03-15','2022-03-17',3.0,'full_day',NULL)
  ) AS v(type, sd, ed, days, dur, reason);
  RAISE NOTICE 'Senanur Samur Duysal: % kayıt', (SELECT count(*) FROM leave_requests WHERE user_id=emp_id AND source='import');
END $$;

-- ===== Ecem Kuşçuoğlu (17 kayıt | yıllık 45.0 + mazeret 0) =====
DO $$
DECLARE emp_id TEXT;
BEGIN
  SELECT id INTO emp_id FROM employees
   WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'ECEM KUSCUOGLU'
   ORDER BY (google_id IS NOT NULL) DESC, hire_date NULLS LAST LIMIT 1;
  IF emp_id IS NULL THEN RAISE EXCEPTION 'Ecem Kuşçuoğlu çalışan kaydı bulunamadı.'; END IF;
  DELETE FROM leave_requests WHERE user_id = emp_id AND source = 'import';
  INSERT INTO leave_requests
    (user_id, type, start_date, end_date, days, status, duration_type, source, reason, created_at)
  SELECT emp_id, v.type, v.sd::date, v.ed::date, v.days, 'onaylandi', v.dur, 'import', v.reason, v.ed::timestamptz
  FROM (VALUES
    ('yillik','2026-05-25','2026-05-26',1.5,'full_day',NULL),
    ('yillik','2025-10-27','2025-10-31',3.5,'full_day',NULL),
    ('yillik','2025-10-03','2025-10-06',2.0,'full_day',NULL),
    ('yillik','2025-09-05','2025-09-05',1.0,'full_day',NULL),
    ('yillik','2025-06-02','2025-06-04',3.0,'full_day',NULL),
    ('yillik','2025-05-12','2025-05-16',5.0,'full_day',NULL),
    ('yillik','2025-05-02','2025-05-02',1.0,'full_day',NULL),
    ('yillik','2024-12-30','2024-12-31',2.0,'full_day',NULL),
    ('yillik','2024-12-24','2024-12-26',3.0,'full_day',NULL),
    ('yillik','2024-09-27','2024-09-30',2.0,'full_day',NULL),
    ('yillik','2024-06-20','2024-06-21',2.0,'full_day','kurban bayramı 2 gün birleştirme'),
    ('yillik','2024-05-21','2024-05-24',4.0,'full_day',NULL),
    ('yillik','2024-04-08','2024-04-09',1.5,'full_day','ramazan bayramı 1,5 gün birleştirme'),
    ('yillik','2024-01-11','2024-01-11',1.0,'full_day',NULL),
    ('yillik','2023-09-05','2023-09-08',4.0,'full_day',NULL),
    ('yillik','2023-06-26','2023-06-27',1.5,'full_day',NULL),
    ('yillik','2023-06-05','2023-06-13',7.0,'full_day',NULL)
  ) AS v(type, sd, ed, days, dur, reason);
  RAISE NOTICE 'Ecem Kuşçuoğlu: % kayıt', (SELECT count(*) FROM leave_requests WHERE user_id=emp_id AND source='import');
END $$;

-- ===== Ayhan Okuyan (18 kayıt | yıllık 35.0 + mazeret 2.0) =====
DO $$
DECLARE emp_id TEXT;
BEGIN
  SELECT id INTO emp_id FROM employees
   WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'AYHAN OKUYAN'
   ORDER BY (google_id IS NOT NULL) DESC, hire_date NULLS LAST LIMIT 1;
  IF emp_id IS NULL THEN RAISE EXCEPTION 'Ayhan Okuyan çalışan kaydı bulunamadı.'; END IF;
  DELETE FROM leave_requests WHERE user_id = emp_id AND source = 'import';
  INSERT INTO leave_requests
    (user_id, type, start_date, end_date, days, status, duration_type, source, reason, created_at)
  SELECT emp_id, v.type, v.sd::date, v.ed::date, v.days, 'onaylandi', v.dur, 'import', v.reason, v.ed::timestamptz
  FROM (VALUES
    ('yillik','2026-05-25','2026-05-26',1.5,'full_day',NULL),
    ('mazeret','2026-05-12','2026-05-13',2.0,'full_day','Cenaze izni'),
    ('yillik','2026-03-19','2026-03-19',0.5,'half_day',NULL),
    ('yillik','2026-02-26','2026-02-26',1.0,'full_day',NULL),
    ('yillik','2026-02-24','2026-02-24',1.0,'full_day',NULL),
    ('yillik','2026-02-18','2026-02-19',2.0,'full_day',NULL),
    ('yillik','2026-01-02','2026-01-02',1.0,'full_day',NULL),
    ('yillik','2025-12-04','2025-12-04',1.0,'full_day',NULL),
    ('yillik','2025-08-18','2025-08-22',5.0,'full_day',NULL),
    ('yillik','2025-08-12','2025-08-15',4.0,'full_day',NULL),
    ('yillik','2024-09-23','2024-09-27',5.0,'full_day',NULL),
    ('yillik','2024-05-20','2024-05-20',1.0,'full_day',NULL),
    ('yillik','2024-05-02','2024-05-03',2.0,'full_day',NULL),
    ('yillik','2024-04-08','2024-04-09',1.5,'full_day','ramazan bayramı 1,5 gün birleştirme'),
    ('yillik','2024-02-02','2024-02-02',1.0,'full_day',NULL),
    ('yillik','2023-06-26','2023-06-27',1.5,'full_day',NULL),
    ('yillik','2023-03-13','2023-03-13',1.0,'full_day',NULL),
    ('yillik','2023-01-02','2023-01-06',5.0,'full_day',NULL)
  ) AS v(type, sd, ed, days, dur, reason);
  RAISE NOTICE 'Ayhan Okuyan: % kayıt', (SELECT count(*) FROM leave_requests WHERE user_id=emp_id AND source='import');
END $$;

-- ===== Miray Şen (25 kayıt | yıllık 52.0 + mazeret 0) =====
DO $$
DECLARE emp_id TEXT;
BEGIN
  SELECT id INTO emp_id FROM employees
   WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'MIRAY SEN'
   ORDER BY (google_id IS NOT NULL) DESC, hire_date NULLS LAST LIMIT 1;
  IF emp_id IS NULL THEN RAISE EXCEPTION 'Miray Şen çalışan kaydı bulunamadı.'; END IF;
  DELETE FROM leave_requests WHERE user_id = emp_id AND source = 'import';
  INSERT INTO leave_requests
    (user_id, type, start_date, end_date, days, status, duration_type, source, reason, created_at)
  SELECT emp_id, v.type, v.sd::date, v.ed::date, v.days, 'onaylandi', v.dur, 'import', v.reason, v.ed::timestamptz
  FROM (VALUES
    ('yillik','2026-01-02','2026-01-02',1.0,'full_day',NULL),
    ('yillik','2025-10-28','2025-10-28',0.5,'half_day',NULL),
    ('yillik','2025-10-06','2025-10-06',1.0,'full_day',NULL),
    ('yillik','2025-09-08','2025-09-12',5.0,'full_day',NULL),
    ('yillik','2025-06-02','2025-06-04',3.0,'full_day',NULL),
    ('yillik','2025-05-02','2025-05-02',1.0,'full_day',NULL),
    ('yillik','2025-04-02','2025-04-04',3.0,'full_day',NULL),
    ('yillik','2025-01-17','2025-01-17',1.0,'full_day',NULL),
    ('yillik','2025-01-09','2025-01-09',1.0,'full_day',NULL),
    ('yillik','2025-01-02','2025-01-03',2.0,'full_day',NULL),
    ('yillik','2024-12-30','2024-12-31',2.0,'full_day',NULL),
    ('yillik','2024-10-28','2024-10-28',0.5,'half_day',NULL),
    ('yillik','2024-09-25','2024-09-25',1.0,'full_day',NULL),
    ('yillik','2024-09-02','2024-09-06',5.0,'full_day',NULL),
    ('yillik','2024-06-20','2024-06-21',2.0,'full_day','kurban bayramı 2 gün birleştirme'),
    ('yillik','2024-06-06','2024-06-07',2.0,'full_day',NULL),
    ('yillik','2024-05-27','2024-05-31',5.0,'full_day',NULL),
    ('yillik','2024-04-24','2024-04-25',2.0,'full_day',NULL),
    ('yillik','2024-04-08','2024-04-09',1.5,'full_day','ramazan bayramı 1,5 gün birleştirme'),
    ('yillik','2024-03-25','2024-03-25',1.0,'full_day',NULL),
    ('yillik','2024-03-07','2024-03-07',1.0,'full_day',NULL),
    ('yillik','2024-02-05','2024-02-05',1.0,'full_day',NULL),
    ('yillik','2023-06-26','2023-06-27',1.5,'full_day',NULL),
    ('yillik','2023-06-12','2023-06-14',3.0,'full_day',NULL),
    ('yillik','2022-07-18','2022-07-22',5.0,'full_day',NULL)
  ) AS v(type, sd, ed, days, dur, reason);
  RAISE NOTICE 'Miray Şen: % kayıt', (SELECT count(*) FROM leave_requests WHERE user_id=emp_id AND source='import');
END $$;

-- ===== Murat Yıldız (7 kayıt | yıllık 24.5 + mazeret 0) =====
DO $$
DECLARE emp_id TEXT;
BEGIN
  SELECT id INTO emp_id FROM employees
   WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'MURAT YILDIZ'
   ORDER BY (google_id IS NOT NULL) DESC, hire_date NULLS LAST LIMIT 1;
  IF emp_id IS NULL THEN RAISE EXCEPTION 'Murat Yıldız çalışan kaydı bulunamadı.'; END IF;
  DELETE FROM leave_requests WHERE user_id = emp_id AND source = 'import';
  INSERT INTO leave_requests
    (user_id, type, start_date, end_date, days, status, duration_type, source, reason, created_at)
  SELECT emp_id, v.type, v.sd::date, v.ed::date, v.days, 'onaylandi', v.dur, 'import', v.reason, v.ed::timestamptz
  FROM (VALUES
    ('yillik','2026-05-25','2026-05-26',2.0,'full_day',NULL),
    ('yillik','2025-09-22','2025-09-26',5.0,'full_day',NULL),
    ('yillik','2025-07-28','2025-08-01',5.0,'full_day',NULL),
    ('yillik','2025-05-02','2025-05-02',1.0,'full_day',NULL),
    ('yillik','2025-01-20','2025-01-24',5.0,'full_day',NULL),
    ('yillik','2024-08-05','2024-08-09',5.0,'full_day',NULL),
    ('yillik','2024-04-08','2024-04-09',1.5,'full_day',NULL)
  ) AS v(type, sd, ed, days, dur, reason);
  RAISE NOTICE 'Murat Yıldız: % kayıt', (SELECT count(*) FROM leave_requests WHERE user_id=emp_id AND source='import');
END $$;

-- Kontrol (içe aktarılan kayıtlar):
SELECT e.name, lr.type, count(*) AS adet, SUM(lr.days) AS gun
FROM leave_requests lr JOIN employees e ON e.id = lr.user_id
WHERE lr.source='import'
  AND upper(translate(e.name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) IN
      ('CEM VOLKAN DOGAN','SENANUR SAMUR DUYSAL','ECEM KUSCUOGLU','AYHAN OKUYAN','MIRAY SEN','MURAT YILDIZ')
GROUP BY e.name, lr.type ORDER BY e.name, lr.type;
