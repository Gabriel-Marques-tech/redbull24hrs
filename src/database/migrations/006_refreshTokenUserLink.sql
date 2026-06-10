-- Liga refresh_tokens a managers/auditors via FKs (abordagem B).
-- Antes: user_id + user_role polimórficos, sem integridade referencial.
-- Depois: manager_id e auditor_id (nullable, FK, CASCADE), exatamente um preenchido.

-- 1. Novas colunas FK
ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS manager_id INT REFERENCES managers(id) ON UPDATE CASCADE ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS auditor_id INT REFERENCES auditors(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 2. Backfill a partir das colunas polimórficas (se ainda existirem)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens' AND column_name = 'user_role'
  ) THEN
    UPDATE refresh_tokens SET manager_id = user_id WHERE user_role = 'manager' AND manager_id IS NULL;
    UPDATE refresh_tokens SET auditor_id = user_id WHERE user_role = 'auditor' AND auditor_id IS NULL;
  END IF;
END $$;

-- 3. Remove o polimorfismo antigo (constraint, índice e colunas)
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS chk_refresh_tokens_role;
DROP INDEX IF EXISTS idx_refresh_tokens_user;
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS user_id;
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS user_role;

-- 4. Garante: exatamente um dono (manager OU auditor)
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS chk_refresh_tokens_owner;
ALTER TABLE refresh_tokens
  ADD CONSTRAINT chk_refresh_tokens_owner CHECK (num_nonnulls(manager_id, auditor_id) = 1);

-- 5. Índices nas novas FKs
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_manager_id ON refresh_tokens(manager_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_auditor_id ON refresh_tokens(auditor_id);
