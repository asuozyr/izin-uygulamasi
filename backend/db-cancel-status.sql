-- db-cancel-status.sql
-- "İptal edildi" durumunu (iptal) izin taleplerine ekler.
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_status_check
  CHECK (status IN ('beklemede', 'onaylandi', 'reddedildi', 'iptal'));
