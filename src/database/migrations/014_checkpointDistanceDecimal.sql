-- Migration 014: permite km decimal em checkpoints e shifts
ALTER TABLE checkpoints
    ALTER COLUMN distance TYPE NUMERIC(8,2) USING distance::NUMERIC(8,2);

ALTER TABLE shifts
    ALTER COLUMN distance TYPE NUMERIC(8,2) USING distance::NUMERIC(8,2);
