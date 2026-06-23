-- db-admin-leave.sql
-- Yönetici tarafından çalışan adına oluşturulan izinler için kaynak + audit alanları.
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'self';
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS created_by_admin_id TEXT REFERENCES employees(id);
