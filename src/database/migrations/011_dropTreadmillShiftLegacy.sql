-- Remove legacy treadmills.shift_id (replaced by shifts.treadmill_id in 004).
-- Its ON DELETE CASCADE caused treadmills to be deleted when shifts were cleared.
ALTER TABLE treadmills DROP CONSTRAINT IF EXISTS fk_treadmills_shift;
ALTER TABLE treadmills DROP COLUMN IF EXISTS shift_id;
