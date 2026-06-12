-- Migration 009: vincula esteiras a equipes (cada equipe tem suas próprias esteiras)
ALTER TABLE treadmills
    ADD COLUMN IF NOT EXISTS team_id INT REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_treadmills_team_id ON treadmills(team_id);
