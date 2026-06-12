-- Expande tipos de log: adiciona 'abandoned' (turno encerrado por saída) e 'force_closed' (encerrado manualmente por manager/operador)
ALTER TABLE logs DROP CONSTRAINT IF EXISTS chk_logs_type;
ALTER TABLE logs ADD CONSTRAINT chk_logs_type
    CHECK (type IN ('created', 'updated', 'finished', 'abandoned', 'force_closed'));
