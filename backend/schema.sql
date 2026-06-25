-- schema.sql
-- Run this once against your PostgreSQL database (Cloud SQL) to create
-- the tables and insert the demo data.

CREATE TABLE IF NOT EXISTS employees (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  initials           TEXT NOT NULL,
  balance            INTEGER NOT NULL DEFAULT 14,
  hire_date          DATE,
  total_earned_leave NUMERIC(7,2) NOT NULL DEFAULT 0,
  leave_balance      NUMERIC(7,2) NOT NULL DEFAULT 0,
  employee_color     TEXT
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES employees(id),
  type        TEXT NOT NULL CHECK (type IN ('yillik', 'mazeret', 'hastalik', 'ucretsiz')),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  days        NUMERIC(5,1) NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'beklemede'
              CHECK (status IN ('beklemede', 'onaylandi', 'reddedildi', 'iptal')),
  duration_type       TEXT NOT NULL DEFAULT 'full_day'
              CHECK (duration_type IN ('full_day', 'half_day', 'custom')),
  use_residence_city  BOOLEAN NOT NULL DEFAULT false,
  use_existing_phone  BOOLEAN NOT NULL DEFAULT false,
  source              TEXT NOT NULL DEFAULT 'self',
  created_by_admin_id TEXT REFERENCES employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Demo data (optional - remove for production)
INSERT INTO employees (id, name, initials, balance) VALUES
  ('u1', 'Ayşe Kaya', 'AK', 14),
  ('u2', 'Mehmet Demir', 'MD', 9),
  ('u3', 'Zeynep Arslan', 'ZA', 18)
ON CONFLICT (id) DO NOTHING;

INSERT INTO leave_requests (user_id, type, start_date, end_date, days, reason, status) VALUES
  ('u1', 'yillik', '2026-06-15', '2026-06-19', 5, 'Aile ziyareti', 'beklemede'),
  ('u2', 'mazeret', '2026-06-12', '2026-06-12', 1, 'Sağlık kontrolü', 'onaylandi'),
  ('u3', 'hastalik', '2026-06-10', '2026-06-11', 2, 'Grip', 'onaylandi'),
  ('u1', 'yillik', '2026-07-01', '2026-07-03', 3, 'Tatil', 'reddedildi')
ON CONFLICT DO NOTHING;
