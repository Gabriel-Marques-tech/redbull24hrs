-- RF013/RF014: suporte a imagem opcional em turnos e checkpoints (issue #268) | atletas e eventos (issue #255)
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE checkpoints
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE athletes
    ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS image_url TEXT;
