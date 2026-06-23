-- db-leave-accrual.sql
-- Yıllık izin hakediş: hire_date + hesaplanan total_earned_leave / leave_balance alanları + tohum veri.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS total_earned_leave NUMERIC(7,2) NOT NULL DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS leave_balance NUMERIC(7,2) NOT NULL DEFAULT 0;

-- Çalışanların işe giriş tarihleri (mevcut kayıtlar güncellenir, yoksa eklenir).
-- İsim eşleştirmesi Türkçe karakterleri ASCII'ye katlayarak yapılır (İ/ı/ş/ğ... çakışmasın).
UPDATE employees SET hire_date = '2021-04-22' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'AYHAN OKUYAN';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_ayhan_okuyan', 'AYHAN OKUYAN', 'AO', 14, 'calisan', '2021-04-22'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'AYHAN OKUYAN');
UPDATE employees SET hire_date = '2023-03-06' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'BERKER BOYACI';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_berker_boyaci', 'BERKER BOYACI', 'BB', 14, 'calisan', '2023-03-06'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'BERKER BOYACI');
UPDATE employees SET hire_date = '2021-01-08' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'CEM VOLKAN DOGAN';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_cem_volkan_dogan', 'CEM VOLKAN DOĞAN', 'CD', 14, 'calisan', '2021-01-08'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'CEM VOLKAN DOGAN');
UPDATE employees SET hire_date = '2022-10-03' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'ECEM KUSCUOGLU';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_ecem_kuscuoglu', 'ECEM KUŞCUOĞLU', 'EK', 14, 'calisan', '2022-10-03'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'ECEM KUSCUOGLU');
UPDATE employees SET hire_date = '2021-05-24' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'MIRAY SEN';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_miray_sen', 'MİRAY ŞEN', 'MŞ', 14, 'calisan', '2021-05-24'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'MIRAY SEN');
UPDATE employees SET hire_date = '2023-03-10' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'MURAT YILDIZ';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_murat_yildiz', 'MURAT YILDIZ', 'MY', 14, 'calisan', '2023-03-10'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'MURAT YILDIZ');
UPDATE employees SET hire_date = '2020-01-20' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'OZAN BILER';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_ozan_biler', 'OZAN BİLER', 'OB', 14, 'calisan', '2020-01-20'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'OZAN BILER');
UPDATE employees SET hire_date = '2021-02-01' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'OMER FERHAD SARIOGLU';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_omer_ferhad_sarioglu', 'ÖMER FERHAD SARIOĞLU', 'ÖS', 14, 'calisan', '2021-02-01'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'OMER FERHAD SARIOGLU');
UPDATE employees SET hire_date = '2021-08-16' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'SAFA EMRE YILDIRIM';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_safa_emre_yildirim', 'SAFA EMRE YILDIRIM', 'SY', 14, 'calisan', '2021-08-16'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'SAFA EMRE YILDIRIM');
UPDATE employees SET hire_date = '2022-03-02' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'SENANUR SAMUR DUYSAL';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_senanur_samur_duysal', 'SENANUR SAMUR DUYSAL', 'SD', 14, 'calisan', '2022-03-02'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'SENANUR SAMUR DUYSAL');
UPDATE employees SET hire_date = '2022-11-07' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'UMUT DUNDAR';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_umut_dundar', 'UMUT DÜNDAR', 'UD', 14, 'calisan', '2022-11-07'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'UMUT DUNDAR');
UPDATE employees SET hire_date = '2019-09-01' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'UTKU KAYA';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_utku_kaya', 'UTKU KAYA', 'UK', 14, 'calisan', '2019-09-01'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'UTKU KAYA');
UPDATE employees SET hire_date = '2025-05-02' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'AYSE YALCINER';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_ayse_yalciner', 'AYŞE YALÇINER', 'AY', 14, 'calisan', '2025-05-02'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'AYSE YALCINER');
UPDATE employees SET hire_date = '2025-02-21' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'DENIZ KATIRCIOGLU';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_deniz_katircioglu', 'DENİZ KATIRCIOĞLU', 'DK', 14, 'calisan', '2025-02-21'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'DENIZ KATIRCIOGLU');
UPDATE employees SET hire_date = '2026-04-01' WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'ASU OZAYAR';
INSERT INTO employees (id, name, initials, balance, role, hire_date)
  SELECT 'seed_asu_ozayar', 'ASU OZAYAR', 'AO', 14, 'calisan', '2026-04-01'
  WHERE NOT EXISTS (SELECT 1 FROM employees WHERE upper(translate(name,'çÇğĞıİöÖşŞüÜ','cCgGiIoOsSuU')) = 'ASU OZAYAR');

-- Stored snapshot'ları doldur (API yine de canlı/günlük hesaplar).
UPDATE employees SET total_earned_leave = ROUND(
  ((EXTRACT(YEAR FROM age(CURRENT_DATE, hire_date)) * 12
    + EXTRACT(MONTH FROM age(CURRENT_DATE, hire_date))) * 1.25
   + EXTRACT(YEAR FROM age(CURRENT_DATE, hire_date)))::numeric, 2)
WHERE hire_date IS NOT NULL;
UPDATE employees e SET leave_balance = ROUND(
  (e.total_earned_leave - COALESCE((
     SELECT SUM(days) FROM leave_requests lr
     WHERE lr.user_id = e.id AND lr.type = 'yillik' AND lr.status = 'onaylandi'
  ), 0))::numeric, 2)
WHERE hire_date IS NOT NULL;
