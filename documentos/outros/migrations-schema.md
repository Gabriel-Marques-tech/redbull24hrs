# Histórico de Migrations — Esquema do Banco (RedRunners)

Documento de apoio para revisão dos diagramas (ER / banco). Lista todas as migrations,
o que cada uma altera no esquema e o estado final consolidado das tabelas.

Banco: PostgreSQL (Supabase). Acesso via `pg` Pool (SQL puro, sem ORM).
Migrations em `src/database/migrations/`, executor em `src/database/migrate.ts`.

---

## 1. Ordem e propósito das migrations

| Arquivo | Propósito |
|---|---|
| `001_initialSchema.sql` | Esquema inicial: todas as tabelas base, constraints e índices |
| `002_managerEventRelation.sql` | Troca relação manager↔event de 1:N para N:N (tabela associativa) |
| `003_softDelete.sql` | Adiciona soft delete (`deleted_at`) em events, teams, athletes |
| `004_shiftTreadmill.sql` | Adiciona FK `treadmill_id` em shifts |
| `005_checkpointCorrection.sql` | RF031: correção retroativa de checkpoints + enriquecimento de logs |
| `006_refreshTokenUserLink.sql` | Liga refresh_tokens a managers/auditors via FKs (abordagem B) |
| `007_checkpointSyncId.sql` | RF026: adiciona sync_id VARCHAR(64) em checkpoints + índice único parcial |

Execução: `npm run migrate`. As migrations são **idempotentes** e rastreadas pela
tabela de controle `schema_migrations` (cada arquivo roda uma única vez).

---

## 2. Detalhe das alterações por migration

### 001 — Esquema inicial
Cria as tabelas base com `CREATE TABLE IF NOT EXISTS`:

- **managers** — id, cpf (único, validado por regex 11 dígitos), name, password, email (único)
- **events** — id, title (único), local, date, manager_id (FK → managers), único (date, local)
- **teams** — id, name, event_id (FK → events, ON DELETE CASCADE), único (event_id, name)
- **athletes** — id, name, gender, cpf (único, regex), team_id (FK → teams, CASCADE)
- **auditors** — id, name, cpf, registration_number (único), is_active, password, email (único)
- **shifts** — id, status (`pending`/`in_progress`/`completed`), athlete_id (FK), auditor_id (FK),
  start_at, total_time (interval), end_at, speed, km_start, km_end, distance.
  Checks: speed ≥ 0, km_end ≥ km_start, distance ≥ 0, end_at ≥ start_at
- **treadmills** — id, shift_id (FK → shifts, CASCADE), number (único)
- **logs** — id, shift_id (FK → shifts, CASCADE), timestamp, type (`created`/`updated`/`finished`)
- **checkpoints** — id, shift_id (FK), timestamp, distance, type (`mandatory`/`voluntary`)
- **refresh_tokens** — id, token_hash (único), user_id, user_role (`manager`/`auditor`),
  expires_at, revoked_at, created_at

Mais índices em todas as FKs.

### 002 — Relação manager ↔ event (N:N)
- **Remove** coluna `events.manager_id` (antes 1 evento → 1 manager).
- **Cria** tabela associativa **manager_events**: (manager_id, event_id) como PK composta,
  ambas FK com `ON DELETE CASCADE`.
- Índices em manager_events(manager_id) e manager_events(event_id).

> Impacto no diagrama: evento e manager passam a ter cardinalidade **N:N** via `manager_events`.

### 003 — Soft delete
Adiciona coluna `deleted_at TIMESTAMP DEFAULT NULL` em:
- **events**
- **teams**
- **athletes**

Registro "apagado" = `deleted_at IS NOT NULL`. Todas as queries de leitura filtram
`WHERE deleted_at IS NULL`. Nenhum DELETE físico nessas três tabelas.

> Impacto no diagrama: events, teams e athletes ganham atributo `deleted_at` (nullable).

### 004 — Esteira no turno
- Adiciona `shifts.treadmill_id INT` como FK → treadmills(id) (ON UPDATE CASCADE, ON DELETE RESTRICT).

> Impacto no diagrama: shift passa a referenciar diretamente a esteira usada.

### 005 — Correção retroativa de checkpoints (RF031)
Enriquece duas tabelas (todas com `ADD COLUMN IF NOT EXISTS`):

**checkpoints** ganha:
- `reviewed` BOOLEAN DEFAULT FALSE — marca se o ponto foi corrigido
- `justification` TEXT — motivo da correção
- `reviewed_at` TIMESTAMP — quando corrigido
- `reviewed_by_id` INT — autor da correção
- `reviewed_by_role` VARCHAR(20) — papel do autor
- `old_distance` INT — distância antes da correção

**logs** ganha (trilha de auditoria — RF024/RN23):
- `checkpoint_id` INT FK → checkpoints (ON DELETE CASCADE)
- `old_value` INT — valor anterior
- `new_value` INT — valor novo
- `author_id` INT — autor da ação
- `author_role` VARCHAR(20) — papel do autor
- `justification` TEXT — motivo

> Impacto no diagrama: checkpoint vira auditável (quem/quando/por quê corrigiu) e
> logs registram diff (old/new), autor e vínculo opcional a um checkpoint.

### 006 — Vínculo de refresh_tokens com usuários (abordagem B)
Problema: `refresh_tokens` guardava `user_id` + `user_role` polimórficos, **sem FK** —
nenhuma integridade referencial (token podia apontar pra usuário inexistente).
PostgreSQL não permite uma FK apontar pra duas tabelas (managers e auditors).

Solução adotada (**abordagem B — duas FKs nullable + CHECK**):
- **Adiciona** `manager_id INT` FK → managers(id) (ON DELETE CASCADE)
- **Adiciona** `auditor_id INT` FK → auditors(id) (ON DELETE CASCADE)
- **Backfill** dos tokens existentes a partir de `user_id`/`user_role`
- **Remove** colunas `user_id`, `user_role` e a constraint `chk_refresh_tokens_role`
- **CHECK** `chk_refresh_tokens_owner`: `num_nonnulls(manager_id, auditor_id) = 1`
  (exatamente um dono — manager OU auditor)
- Índices em manager_id e auditor_id

Por que B e não tabela `users`: integridade real com impacto mínimo. Uma supertabela
`users` exigiria refatorar todo o domínio de auth (managers, auditors, login, JWT) —
escopo maior do que o problema pede. O papel do dono é derivado de qual coluna está
preenchida; `ON DELETE CASCADE` limpa os tokens quando o usuário é removido.

> Impacto no diagrama: refresh_tokens passa a ter **duas relações N:1 mutuamente
> exclusivas** — com managers e com auditors. Não há mais `user_id`/`user_role`.

---

## 3. Esquema final consolidado (pós todas as migrations)

### events
id, title, local, date, **deleted_at** *(manager_id removido — ver manager_events)*

### manager_events *(nova em 002)*
manager_id (PK, FK→managers), event_id (PK, FK→events)

### teams
id, name, event_id (FK→events), **deleted_at**

### athletes
id, name, gender, cpf, team_id (FK→teams), **deleted_at**

### managers
id, cpf, name, password, email

### auditors
id, name, cpf, registration_number, is_active, password, email

### shifts
id, status, athlete_id (FK), auditor_id (FK), start_at, total_time, end_at,
speed, km_start, km_end, distance, **treadmill_id** (FK→treadmills)

### treadmills
id, shift_id (FK→shifts), number

### checkpoints
id, shift_id (FK), timestamp, distance, type,
**reviewed, justification, reviewed_at, reviewed_by_id, reviewed_by_role, old_distance**

### logs
id, shift_id (FK), timestamp, type,
**checkpoint_id (FK), old_value, new_value, author_id, author_role, justification**

### refresh_tokens
id, token_hash, **manager_id** (FK→managers, nullable), **auditor_id** (FK→auditors, nullable),
expires_at, revoked_at, created_at
*(CHECK: exatamente um de manager_id/auditor_id preenchido. `user_id`/`user_role` removidos em 006)*

### schema_migrations *(controle interno do executor)*
filename (PK), applied_at

---

## 4. Pontos de atenção para o revisor dos diagramas

1. **manager ↔ event é N:N** (via `manager_events`), não 1:N. `events.manager_id` não existe mais.
2. **events, teams, athletes usam soft delete** (`deleted_at`) — não há deleção física.
3. **shift referencia treadmill** diretamente (`shifts.treadmill_id`), além de treadmills.shift_id.
4. **logs são imutáveis** (RN23): só INSERT, nunca UPDATE/DELETE. Tipos: created/updated/finished.
   Campos de diff (old_value/new_value), autor (author_id/author_role) e vínculo opcional a checkpoint.
5. **checkpoints carregam metadados de correção** (reviewed, old_distance, reviewed_by_*).
6. **refresh_tokens liga-se a managers E auditors** por duas FKs nullable mutuamente
   exclusivas (CHECK: exatamente uma preenchida). Não existe mais `user_id`/`user_role`
   nem tabela `users`.
7. **RF003 (RN17/RN28)**: `POST /audit/shifts/start` valida que todas as equipes do evento
   do atleta têm exatamente 16 corredores ativos antes de abrir o turno. Sem coluna nova —
   implementado via query em `shiftRepository.validateTeamsForAthlete`. Retorna 422 se violado.
9. **RF026 (RN27)**: `POST /audit/sync` — batch de checkpoints offline. Frontend gera
   `sync_id = SHA256(shift_id|distance|checkpoint_type|timestamp)` (hex 64 chars).
   Backend insere com timestamp original; `ON CONFLICT (sync_id) WHERE sync_id IS NOT NULL DO NOTHING`
   garante idempotência. Resposta: `{ inserted, skipped, errors[] }`.
8. **RF050 (RN36)**: `GET /metrics/athletes/:athleteId/share` — rota **pública** (sem auth).
   Retorna desempenho all-time do atleta (summary + shifts completed). Registrada ANTES do
   `router.use(requireAuth)` no metricsRoutes — demais rotas de métricas seguem protegidas.
7. `schema_migrations` é tabela de controle do executor de migrations — pode ficar fora do diagrama de domínio.
