-- RF016: modo offline do tablet.
-- client_id = identificador gerado pelo tablet para cada turno. Permite reenviar
-- o mesmo "iniciar turno" várias vezes sem criar turnos duplicados.
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS client_id VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_client_id
  ON shifts(client_id)
  WHERE client_id IS NOT NULL;

-- Garantia no banco de que não existem dois turnos abertos para o mesmo atleta
-- nem para a mesma esteira. As checagens do service continuam valendo; estes
-- índices fecham a janela em que duas requisições simultâneas passavam juntas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_open_athlete
  ON shifts(athlete_id)
  WHERE status = 'in_progress';

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_open_treadmill
  ON shifts(treadmill_id)
  WHERE status = 'in_progress' AND treadmill_id IS NOT NULL;
