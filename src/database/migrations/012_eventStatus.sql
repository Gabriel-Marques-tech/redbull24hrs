-- Migration 012: ciclo de vida do evento (pending -> in_progress -> finished)
-- Manager inicia (pending->in_progress) e finaliza (in_progress->finished).
-- Auditor só pode operar turnos enquanto o evento está 'in_progress'.
ALTER TABLE events ADD COLUMN IF NOT EXISTS status      VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE events ADD COLUMN IF NOT EXISTS started_at  TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;

ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_status;
ALTER TABLE events ADD  CONSTRAINT chk_events_status
	CHECK (status IN ('pending', 'in_progress', 'finished'));
