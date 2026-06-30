-- db-notifications.sql
-- Uygulama içi bildirim merkezi.
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,        -- request_created | request_approved | request_rejected | admin_created | admin_updated | admin_cancelled
  title       TEXT NOT NULL,
  body        TEXT,
  request_id  INTEGER,              -- ilgili leave_requests.id (silinebilir, FK koymuyoruz)
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, read, created_at DESC);
