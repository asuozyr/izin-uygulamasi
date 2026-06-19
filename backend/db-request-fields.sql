-- db-request-fields.sql
-- İzin talebine ek alanlar: saat aralığı, işe dönüş tarihi, izin yeri, iletişim telefonu.
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS start_time    TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS end_time      TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS return_date   DATE;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS location      TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS contact_phone TEXT;
