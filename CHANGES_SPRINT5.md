# Mudanças — Sprint 5

> Documento para alinhamento com colaboradores antes do merge final em `develop` → `main`.
> As numerações 020–025 são a ordem **após renumeração** das colisões entre branches.

---

## Branches e MRs envolvidos

| Branch | MR | Feature |
|--------|----|---------|
| `feat/fotos` | !171 | Upload de fotos em atletas e eventos |
| `feat/ocr-integration` | !174 | Leitura OCR de esteiras |
| `feat/competition-pause` | !173 | Pausar/retomar competição |
| `274-feat/selecao-colunas-exportacao` | !177 | Seleção de colunas na exportação |
| `feat/modo-tv` | !179 | Modo TV — placar público |
| `feat/shareSystem` | !178 | Compartilhamento de desempenho por email |

---

## Migrations (ordem de aplicação em produção)

| # final | Arquivo original | Branch | O que faz |
|---------|-----------------|--------|-----------|
| 018 | `018_shiftKmDecimal.sql` | main | `km_start`, `km_end`, `speed` em `shifts` convertidos de INT para NUMERIC(8,2) |
| 019 | `019_imageUrl.sql` | develop | `image_url TEXT` em `shifts` e `checkpoints` |
| 020 | `020_athleteEventImageUrl.sql` | feat/fotos | `image_url TEXT` em `athletes` e `events` |
| 021 | `021_ocrFields.sql` | feat/ocr-integration | `ocr_speed`, `ocr_distance`, `ocr_pace`, `ocr_time` em `shifts` e `checkpoints` |
| 022 | `021_eventPause.sql` → renomear | feat/competition-pause | `paused_at TIMESTAMP` e `paused_ms BIGINT DEFAULT 0` em `events` |
| 023 | `022_pauseLog.sql` → renomear | feat/competition-pause | tabela `pause_log` (rastreio de intervalos de pausa por evento) |
| 024 | `022_athleteShareToken.sql` → renomear | feat/shareSystem | `share_token UUID` em `athletes` |
| 025 | `023_athleteEmail.sql` → renomear | feat/shareSystem | `email VARCHAR(255)` em `athletes` |

> **Atenção na renumeração:** ao mergear `feat/competition-pause`, renomear `021_eventPause.sql` → `022_` e `022_pauseLog.sql` → `023_`. Ao mergear `feat/shareSystem`, renomear `022_athleteShareToken.sql` → `024_` e `023_athleteEmail.sql` → `025_`.

---

## Novas variáveis de ambiente (`.env`)

```env
# Upload de fotos (feat/fotos + feat/ocr-integration)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Envio de email (feat/shareSystem)
RESEND_API_KEY=re_xxxx
EMAIL_FROM=Red Bull 24H <noreply@seudominio.com>
APP_BASE_URL=https://seuapp.onrender.com
```

---

## Novos endpoints

### feat/fotos (!171)
| Método | Rota | Auth | O que faz |
|--------|------|------|-----------|
| `POST` | `/events/` | manager | Aceita `multipart/form-data` com campo `photo` (≤5MB) |
| `PATCH` | `/events/:id` | manager | Aceita `photo` ou `remove_photo=true` |
| `POST` | `/teams/:teamId/athletes` | manager | Aceita `photo` (≤5MB) |
| `PATCH` | `/teams/:teamId/athletes/:id` | manager | Aceita `photo` ou `remove_photo=true` |

### feat/competition-pause (!173)
| Método | Rota | Auth | O que faz |
|--------|------|------|-----------|
| `PATCH` | `/events/:id/pause` | manager | Pausa a competição — congela cronômetro |
| `PATCH` | `/events/:id/resume` | manager | Retoma a competição |

> Enquanto pausado: `startShift` e `addCheckpoint` retornam 409.

### feat/selecao-colunas-exportacao (!177)
| Método | Rota | Auth | O que faz |
|--------|------|------|-----------|
| `GET` | `/export/events/:eventId/shifts?columns=col1,col2` | manager | Exporta XLSX com colunas selecionadas. CPF removido permanentemente. |

### feat/modo-tv (!179)
| Método | Rota | Auth | O que faz |
|--------|------|------|-----------|
| `GET` | `/metrics/events/:eventId/gender-km` | manager | Km por gênero (mulheres/homens) |
| `GET` | `/metrics/events/:eventId/pace` | manager | Pace médio do período de 6h vigente |
| `GET` | `/metrics/events/:eventId/tv` | manager | Resumo TV: total km + gênero + pace em 1 request |

### feat/shareSystem (!178)
| Método | Rota | Auth | O que faz |
|--------|------|------|-----------|
| `GET` | `/share/athlete/:token` | público | Card SSR de desempenho do atleta |
| `GET` | `/share/athlete/:token/data` | público | Stats do atleta em JSON |
| `GET` | `/share/event/:eventId/athletes` | manager | Lista atletas com share links e emails |
| `POST` | `/share/athlete/:token/send-email` | manager | Envia email com link individual ao atleta |
| `GET` | `/manager/event/:id/share` | manager | Tela SSR de gerenciamento de compartilhamento |

---

## Mudanças no comportamento existente

- **`POST /events/:id/finish`** (feat/competition-pause): agora fecha pausa aberta antes de encerrar. Resposta inclui campos `paused_at` e `paused_ms`.
- **`GET /export/events/:eventId/shifts`** (feat/selecao-colunas): CPF removido do retorno permanentemente.
- **Registro de turno e checkpoint**: bloqueados durante pausa de competição (retornam 409 com mensagem "Competição pausada").
- **`POST /events/:id/finish`** (feat/shareSystem): gera `share_token` UUID para cada atleta do evento ao finalizar.

---

## Dependências novas (`npm install`)

```bash
npm install resend      # feat/shareSystem — envio de email
# multer já era dependência; versão sem alteração
```

---

## O que precisa ser feito antes de ir para produção

- [ ] Renumerar migrations conforme tabela acima antes do merge
- [ ] Aplicar migrations 018–025 no banco de produção (em ordem)
- [ ] Configurar variáveis de ambiente no Render
- [ ] Verificar domínio de email no Resend (resend.com/domains)
- [ ] Criar bucket `photos` no Supabase Storage com policy pública de leitura
