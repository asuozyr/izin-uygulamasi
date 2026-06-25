-- db-form-options.sql
-- Gün tipi sadeleştirildi: full_day / half_day / custom (duration_type kolonunda tutulur).
-- Eski yarım gün değerleri tek 'half_day' altında toplanır.
UPDATE leave_requests SET duration_type = 'half_day'
WHERE duration_type IN ('half_day_morning', 'half_day_afternoon');

ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_duration_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_duration_type_check
  CHECK (duration_type IN ('full_day', 'half_day', 'custom'));

-- Yer/telefon için "kayıtlı bilgimi kullan" seçenekleri
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS use_residence_city BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS use_existing_phone BOOLEAN NOT NULL DEFAULT false;
