-- Migration 015: remove UNIQUE de treadmills.number.
-- Numero da esteira passa a ser relativo ao evento/equipe (1,2,3,4 por evento),
-- entao o mesmo numero pode se repetir entre eventos diferentes.
ALTER TABLE treadmills DROP CONSTRAINT IF EXISTS treadmills_number_key;
