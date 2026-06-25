-- Migration 022: adiciona coluna pace em shifts para registro manual do auditor
-- pace representa o ritmo configurado na esteira (formato MM:SS por km)
-- nullable pois turnos anteriores não possuem esse dado

ALTER TABLE shifts
    ADD COLUMN IF NOT EXISTS pace VARCHAR(8);
