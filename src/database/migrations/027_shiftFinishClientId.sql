-- RF016: identificador do encerramento gerado pelo tablet.
-- Permite distinguir "este fim já foi gravado" (reenvio) de "o turno foi fechado
-- por outro caminho enquanto o tablet estava sem conexão".
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS finish_client_id VARCHAR(64);
