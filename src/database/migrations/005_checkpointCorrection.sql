ALTER TABLE checkpoints
  ADD COLUMN IF NOT EXISTS reviewed         BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS justification    TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at      TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reviewed_by_id   INT,
  ADD COLUMN IF NOT EXISTS reviewed_by_role VARCHAR(20),
  ADD COLUMN IF NOT EXISTS old_distance     INT;

ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS checkpoint_id    INT  REFERENCES checkpoints(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS old_value        INT,
  ADD COLUMN IF NOT EXISTS new_value        INT,
  ADD COLUMN IF NOT EXISTS author_id        INT,
  ADD COLUMN IF NOT EXISTS author_role      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS justification    TEXT;