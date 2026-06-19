-- db-google-migration.sql
-- Google ile giriş için veritabanını günceller ve demo kullanıcıları kaldırır.
-- schema.sql (ve daha önce db-auth-patch.sql) çalıştırıldıktan SONRA bir kez çalıştırın.

-- 1) Google için gerekli kolonlar
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role       TEXT NOT NULL DEFAULT 'calisan';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS google_id  TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- E-posta ve Google ID benzersiz olmalı (NULL'lar çakışmaz)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email     ON employees(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_google_id ON employees(google_id);

-- Yeni çalışanlarda yıllık hak varsayılanı
ALTER TABLE employees ALTER COLUMN balance SET DEFAULT 14;

-- 2) Demo kullanıcıları ve onların izin kayıtlarını kaldır
DELETE FROM leave_requests WHERE user_id IN ('u1', 'u2', 'u3');
DELETE FROM employees      WHERE id      IN ('u1', 'u2', 'u3');

-- Not: Parola tabanlı giriş kaldırıldı. password_hash kolonu artık kullanılmıyor;
-- isterseniz şu satırı açıp kolonu tamamen silebilirsiniz:
-- ALTER TABLE employees DROP COLUMN IF EXISTS password_hash;
