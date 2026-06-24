-- db-edit-requests.sql
-- Talep düzenleme için güncelleme zamanı alanı.
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
