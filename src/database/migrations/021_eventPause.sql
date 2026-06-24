-- Migration 021: pausa de competição. Permite congelar o cronômetro de 24h
-- sem encerrar o evento. O status permanece 'in_progress' durante a pausa para
-- não travar a lógica existente; a pausa é sinalizada apenas por paused_at.
-- paused_at marca o instante em que a pausa começou (NULL = rodando);
-- paused_ms acumula o tempo total já pausado (em milissegundos), somado ao fim
-- do cronômetro para que o tempo restante retome de onde parou.
ALTER TABLE events ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS paused_ms BIGINT NOT NULL DEFAULT 0;
