-- Migration 013: converte eventos do modelo 2-estados (open/closed) para
-- 3-estados (pending -> in_progress -> finished).
-- Idempotente: no-op em bancos onde a 012 já criou o modelo 3-estados.
-- Necessária porque a 012 pode ter sido aplicada na forma antiga antes do rewrite.

-- garante colunas do ciclo de vida
ALTER TABLE events ADD COLUMN IF NOT EXISTS status      VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE events ADD COLUMN IF NOT EXISTS started_at  TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;

-- remove constraint antiga antes de remapear valores
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_status;

-- remapeia valores legados; evento ativo vira in_progress p/ auditores não travarem
UPDATE events SET status = 'in_progress', started_at = COALESCE(started_at, NOW())
 WHERE status = 'open';
UPDATE events SET status = 'finished', finished_at = COALESCE(finished_at, NOW())
 WHERE status = 'closed';

-- novo default e constraint do modelo 3-estados
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE events ADD CONSTRAINT chk_events_status
	CHECK (status IN ('pending', 'in_progress', 'finished'));
