-- suporte a imagem opcional em atletas e eventos (issue #255)
ALTER TABLE athletes
    ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS image_url TEXT;
