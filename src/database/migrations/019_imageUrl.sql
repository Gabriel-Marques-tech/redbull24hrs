-- RF013/RF014: suporte a imagem opcional em turnos e checkpoints (issue #268)
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE checkpoints
  ADD COLUMN IF NOT EXISTS image_url TEXT;
