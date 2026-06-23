-- db-halfday-colors.sql
-- Yarım gün izin (duration_type) + ondalık gün (days) + çalışan rengi (employee_color).

-- 1) days ondalık olsun (0.5 desteği)
ALTER TABLE leave_requests ALTER COLUMN days TYPE NUMERIC(5,1);

-- 2) İzin süresi tipi
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS duration_type TEXT NOT NULL DEFAULT 'full_day';
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_duration_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_duration_type_check
  CHECK (duration_type IN ('full_day', 'half_day_morning', 'half_day_afternoon'));

-- Eski/CSV içe aktarılmış 0.5 günlük kayıtları yarım gün olarak işaretle
UPDATE leave_requests SET duration_type = 'half_day_morning'
WHERE days = 0.5 AND duration_type = 'full_day';

-- 3) Çalışan rengi (pastel, kalıcı, tutarlı)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_color TEXT;
UPDATE employees SET employee_color = (ARRAY[
  '#DCE7FB','#FBE2E6','#E3F3DD','#FBEFD6','#E9E0FB','#D7F0EF',
  '#FBE6F2','#E8EAD6','#F8E2D0','#DDEBF6','#EADFD2','#E0E7E9'
])[(abs(hashtext(id)) % 12) + 1]
WHERE employee_color IS NULL;
