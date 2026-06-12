-- Migration 017: muda old_distance de INT para NUMERIC(8,2) na tabela checkpoints.
-- Necessário porque distance já é NUMERIC(8,2) e old_distance armazena o valor anterior.
ALTER TABLE checkpoints
    ALTER COLUMN old_distance TYPE NUMERIC(8,2) USING old_distance::numeric;
