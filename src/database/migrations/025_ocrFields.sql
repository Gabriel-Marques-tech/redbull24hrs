-- migration 025: campos OCR em shifts e checkpoints
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

-- popula gerente padrao MasterManager (senha123, hash bcrypt rounds 10)
INSERT INTO managers (name, email, password)
VALUES (
  'MasterManager',
  'master@email.com',
  '$2b$10$jXJNbNax/Jkp4CJxXlgQIOIF1xqf6nm/ucOB5/dhx5JejBYNLU5uG'
)
ON CONFLICT (email) DO NOTHING;
