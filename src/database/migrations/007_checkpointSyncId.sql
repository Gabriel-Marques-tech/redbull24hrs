-- RF026: suporte a sincronização offline de checkpoints
-- sync_id = SHA256(shift_id|distance|checkpoint_type|timestamp) gerado pelo frontend
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS sync_id VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkpoints_sync_id
  ON checkpoints(sync_id)
  WHERE sync_id IS NOT NULL;
