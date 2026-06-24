-- migration 021: campos OCR em shifts e checkpoints
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS ocr_speed    NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS ocr_distance NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS ocr_pace     VARCHAR(8),
  ADD COLUMN IF NOT EXISTS ocr_time     VARCHAR(9);

ALTER TABLE checkpoints
  ADD COLUMN IF NOT EXISTS ocr_speed    NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS ocr_distance NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS ocr_pace     VARCHAR(8),
  ADD COLUMN IF NOT EXISTS ocr_time     VARCHAR(9);
