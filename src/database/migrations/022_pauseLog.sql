-- Migration 022: rastreabilidade das pausas de competição.
-- Cada linha registra um intervalo de pausa de um evento: quando começou
-- (paused_at), quando foi retomado (resumed_at, NULL enquanto pausado) e a
-- duração em segundos (preenchida ao retomar/encerrar). A soma das durações
-- é descontada da duração total do evento para que o tempo de competição
-- não seja inflado pelo tempo pausado.
CREATE TABLE IF NOT EXISTS pause_log (
	id               SERIAL PRIMARY KEY,
	event_id         INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	paused_at        TIMESTAMP NOT NULL,
	resumed_at       TIMESTAMP,
	duration_seconds INTEGER,
	created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pause_log_event ON pause_log (event_id);

-- garante no máximo uma pausa em aberto (sem resumed_at) por evento
CREATE UNIQUE INDEX IF NOT EXISTS uq_pause_log_open
	ON pause_log (event_id) WHERE resumed_at IS NULL;
