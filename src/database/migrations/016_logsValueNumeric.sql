-- Migration 016: muda old_value e new_value de INT para NUMERIC(8,2) na tabela logs.
-- Necessário porque checkpoints usam distância decimal (NUMERIC 8,2).
ALTER TABLE logs
    ALTER COLUMN old_value TYPE NUMERIC(8,2) USING old_value::numeric,
    ALTER COLUMN new_value TYPE NUMERIC(8,2) USING new_value::numeric;
