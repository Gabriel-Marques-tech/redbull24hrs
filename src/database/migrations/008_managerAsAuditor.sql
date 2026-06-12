-- Permite que managers também registrem turnos
-- Remove FK exclusiva para auditors e adiciona manager_id opcional

ALTER TABLE shifts
    DROP CONSTRAINT IF EXISTS fk_shifts_auditor,
    ADD COLUMN IF NOT EXISTS manager_id INT REFERENCES managers(id),
    ALTER COLUMN auditor_id DROP NOT NULL;

-- Garante que exatamente um dos dois está preenchido
ALTER TABLE shifts
    DROP CONSTRAINT IF EXISTS chk_shifts_operator,
    ADD CONSTRAINT chk_shifts_operator
        CHECK (num_nonnulls(auditor_id, manager_id) = 1);

CREATE INDEX IF NOT EXISTS idx_shifts_manager_id ON shifts(manager_id);
