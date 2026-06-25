-- Migration 021: pausa de competição. Permite congelar o cronômetro de 24h
-- sem encerrar o evento. O status permanece 'in_progress' durante a pausa para
-- não travar a lógica existente; a pausa é sinalizada apenas por paused_at.
-- paused_at marca o instante em que a pausa começou (NULL = rodando);
-- paused_ms acumula o tempo total já pausado (em milissegundos), somado ao fim
-- do cronômetro para que o tempo restante retome de onde parou.
ALTER TABLE events ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS paused_ms BIGINT NOT NULL DEFAULT 0;

-- rastreabilidade das pausas de competição.
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
