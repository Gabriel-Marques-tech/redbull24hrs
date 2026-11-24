// ─── Requisição com limite de tempo ──────────────────────────
// Sem limite, uma rede ruim deixava a tela esperando para sempre.
const TEMPO_LIMITE_MS        = 8000   // registros (início, checkpoint, fim)
const TEMPO_LIMITE_UPLOAD_MS = 60000  // foto + leitura automática

function fetchComLimite(url, options = {}, limiteMs = TEMPO_LIMITE_MS) {
    const controle = new AbortController()
    const relogio  = setTimeout(() => controle.abort(), limiteMs)
    return fetch(url, { ...options, signal: controle.signal }).finally(() => clearTimeout(relogio))
}

// ─── Auth fetch com refresh automático ───────────────────────
// Devolve undefined quando não há conexão (ou a resposta não chega a tempo).
async function authFetch(url, options = {}) {
    const token  = localStorage.getItem('accessToken')
    const limite = options.body instanceof FormData ? TEMPO_LIMITE_UPLOAD_MS : TEMPO_LIMITE_MS
    const makeReq = (t) => {
        const headers = { 'Authorization': `Bearer ${t}`, ...options.headers }
        if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
        return fetchComLimite(url, { credentials: 'include', ...options, headers }, limite)
    }

    try {
        const res = await makeReq(token)
        if (res.status !== 401) return res

        // Token expirado — tenta refresh via cookie
        const refreshRes = await fetchComLimite('/auth/refresh', { method: 'POST', credentials: 'include' })
        if (!refreshRes.ok) { window.location.href = '/login'; return }

        const { accessToken: newToken } = await refreshRes.json()
        localStorage.setItem('accessToken', newToken)
        return await makeReq(newToken)
    } catch (e) {
        console.warn('Sem resposta do servidor:', url, e?.name || e)
        return undefined
    }
}

// ─── Modo sem internet (RF016) ───────────────────────────────
// Início, checkpoint e fim de turno que não chegam ao servidor ficam guardados
// no tablet (localStorage) e são reenviados, na mesma ordem, quando a conexão
// volta. Cada registro leva um identificador próprio, então reenviar o mesmo
// registro várias vezes nunca cria duplicata no servidor.
const FILA_KEY   = 'rr_fila_v1'    // registros aguardando envio
const MAPA_KEY   = 'rr_mapa_v1'    // id local do turno → id no servidor
const FALHAS_KEY = 'rr_falhas_v1'  // registros que o servidor recusou

function lerJson(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao } catch { return padrao }
}
function gravarJson(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); return true }
    catch (e) { console.error('Falha ao gravar no tablet:', e); return false }
}
const lerFila   = () => lerJson(FILA_KEY, [])
const lerFalhas = () => lerJson(FALHAS_KEY, [])
const filaTemPendencias = () => lerFila().length > 0

// 64 caracteres hexadecimais (mesmo formato do sync_id usado no backend)
function novoId() {
    const bytes = new Uint8Array(32)
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes)
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

// Turno criado sem internet usa o id local (texto) até o servidor responder.
function idServidorDoTurno(ref) {
    if (typeof ref === 'number') return ref
    if (ref == null) return null
    return lerJson(MAPA_KEY, {})[ref] ?? null
}

function enfileirar(op) {
    const fila = lerFila()
    fila.push({ opId: novoId(), criadoEm: Date.now(), ...op })
    const ok = gravarJson(FILA_KEY, fila)
    if (!ok) alert('Não foi possível guardar o registro no tablet. Anote o valor em papel e avise o gestor.')
    atualizarAvisoFila()
    setTimeout(processarFila, 0)
    return ok
}

// Envia um registro. Devolve:
//   { rede: true }            → sem conexão ou servidor fora: tentar de novo depois
//   { ok, status, data }      → o servidor respondeu
async function tentarEnvio(url, method, corpo) {
    let res
    try {
        res = await fetchComLimite(url, {
            method,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            },
            body: JSON.stringify(corpo),
        })
    } catch { return { rede: true } }
    // 5xx / 429 / 401 / 403: problema do servidor ou da sessão, não do registro
    if (res.status >= 500 || res.status === 429 || res.status === 401 || res.status === 403) return { rede: true }
    let data = {}
    try { data = await res.json() } catch { /* corpo vazio */ }
    return { ok: res.ok, status: res.status, data }
}

function registrarFalha(op, motivo) {
    const falhas = lerFalhas()
    falhas.push({ ...op, motivo, falhouEm: Date.now() })
    gravarJson(FALHAS_KEY, falhas)
}

// Reenvia UM registro da fila. Devolve 'depois' (tentar mais tarde) ou 'feito'.
async function enviarOp(op) {
    if (op.tipo === 'start') {
        const r = await tentarEnvio('/audit/shifts/start', 'POST', op.corpo)
        if (r.rede) return 'depois'
        if (r.ok) {
            const mapa = lerJson(MAPA_KEY, {})
            mapa[op.turno] = r.data.id
            gravarJson(MAPA_KEY, mapa)
            aoConfirmarInicio(op.turno, r.data)
            return 'feito'
        }
        if (String(r.data?.error || '').includes('pausada')) return 'depois'
        // Início recusado: os registros seguintes do mesmo turno também não têm onde entrar
        const motivo = r.data?.error || `erro ${r.status}`
        registrarFalha(op, motivo)
        const resto = []
        for (const o of lerFila()) {
            if (o.opId === op.opId) { resto.push(o); continue }
            if (o.turno === op.turno) registrarFalha(o, 'turno não foi criado: ' + motivo)
            else resto.push(o)
        }
        gravarJson(FILA_KEY, resto)
        aoRecusarInicio(op.turno, motivo)
        return 'feito'
    }

    const idTurno = idServidorDoTurno(op.turno)
    if (idTurno == null) { registrarFalha(op, 'turno não encontrado no tablet'); return 'feito' }

    if (op.tipo === 'checkpoint') {
        const r = await tentarEnvio(`/audit/shifts/${idTurno}/checkpoints`, 'POST', op.corpo)
        if (r.rede) return 'depois'
        if (r.ok) { aoConfirmarCheckpoint(op.corpo.sync_id, r.data); return 'feito' }
        if (String(r.data?.error || '').includes('pausada')) return 'depois'
        registrarFalha(op, r.data?.error || `erro ${r.status}`)
        return 'feito'
    }

    if (op.tipo === 'finish') {
        const r = await tentarEnvio(`/audit/shifts/${idTurno}/finish`, 'PATCH', op.corpo)
        if (r.rede) return 'depois'
        // Reenvio do mesmo fim devolve 200 (o servidor reconhece pelo finish_id).
        // Qualquer recusa vai para o aviso vermelho, com o km, para lançamento manual.
        if (r.ok) return 'feito'
        registrarFalha(op, r.data?.error || `erro ${r.status}`)
        return 'feito'
    }

    registrarFalha(op, 'tipo de registro desconhecido')
    return 'feito'
}

let enviandoFila = false
let recarregandoTela = false  // recarga automática não deve disparar o aviso de saída
async function processarFila() {
    if (enviandoFila) return
    enviandoFila = true
    atualizarAvisoFila()
    try {
        while (true) {
            const op = lerFila()[0]
            if (!op) break
            const resultado = await enviarOp(op)
            if (resultado === 'depois') break
            const fila = lerFila()
            if (fila[0]?.opId === op.opId) { fila.shift(); gravarJson(FILA_KEY, fila) }
        }
    } catch (e) {
        console.error('Erro ao reenviar registros:', e)
    } finally {
        enviandoFila = false
        atualizarAvisoFila()
    }
}

window.addEventListener('online',  () => { atualizarAvisoFila(); processarFila() })
window.addEventListener('offline', () => atualizarAvisoFila())
setInterval(() => { if (filaTemPendencias()) processarFila() }, 5000)

// ─── Aviso na tela: sem conexão / registros guardados / recusados ─────
const avisoFilaEl = document.createElement('div')
avisoFilaEl.setAttribute('role', 'status')
avisoFilaEl.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;' +
    'display:none;align-items:center;gap:12px;max-width:92vw;padding:12px 18px;border-radius:10px;' +
    'font:600 15px/1.3 Inter,system-ui,sans-serif;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.25)'
document.body.appendChild(avisoFilaEl)

const ROTULO_OP = { start: 'Início de turno', checkpoint: 'Checkpoint', finish: 'Fim de turno' }

function atualizarAvisoFila() {
    const pendentes = lerFila().length
    const falhas    = lerFalhas().length
    const semRede   = navigator.onLine === false

    if (!pendentes && !falhas && !semRede) { avisoFilaEl.style.display = 'none'; return }

    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`
    let texto, cor
    if (falhas) {
        cor   = '#D2003C'
        texto = `${plural(falhas, 'registro não foi aceito', 'registros não foram aceitos')} pelo servidor. Avise o gestor.`
        if (pendentes) texto += ` Outros ${pendentes} aguardando envio.`
    } else if (pendentes && enviandoFila && !semRede) {
        cor   = '#0F0069'
        texto = `Enviando ${plural(pendentes, 'registro guardado', 'registros guardados')}…`
    } else if (pendentes) {
        cor   = '#0F0069'
        texto = `Sem conexão. ${plural(pendentes, 'registro guardado', 'registros guardados')} no tablet. Pode continuar: o envio é automático.`
    } else {
        cor   = '#0F0069'
        texto = 'Sem conexão. Pode continuar: os registros ficam guardados no tablet.'
    }

    avisoFilaEl.style.background = cor
    avisoFilaEl.style.display = 'flex'
    avisoFilaEl.replaceChildren(document.createTextNode(texto))

    if (falhas) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.textContent = 'Ver'
        btn.style.cssText = 'flex:none;min-width:64px;min-height:44px;border:0;border-radius:8px;background:#fff;color:#D2003C;font:inherit;cursor:pointer'
        btn.addEventListener('click', mostrarFalhas)
        avisoFilaEl.appendChild(btn)
    }
}

function mostrarFalhas() {
    const falhas = lerFalhas()
    const linhas = falhas.map((f, i) => {
        const hora  = new Date(f.criadoEm).toLocaleTimeString('pt-BR')
        const valor = f.corpo?.distance ?? f.corpo?.km_end ?? f.corpo?.km_start
        return `${i + 1}. ${ROTULO_OP[f.tipo] || f.tipo} · ${valor ?? '?'} km · ${hora}\n   Motivo: ${f.motivo}`
    })
    const msg = 'Registros que o servidor não aceitou:\n\n' + linhas.join('\n\n') +
                '\n\nAnote estes valores e passe ao gestor para lançamento manual.' +
                '\n\nJá foi resolvido? OK remove o aviso desta tela.'
    if (confirm(msg)) { gravarJson(FALHAS_KEY, []); atualizarAvisoFila() }
}

// ─── Estado ───────────────────────────────────────────────────
let shiftId        = null   // número (id no servidor) ou texto (id local, turno ainda não enviado)
let kmInicioTurno  = 0      // km inicial do turno em andamento
let timerBase      = 0      // instante (ms) em que o cronômetro estaria em zero
let timerInterval  = null
let segundos       = 0
let emCorrida      = false
let atletaIndex    = 0
let atletaAtual    = ATHLETES[0] || null
let checkpointsSessao = []   // checkpoints do turno atual
let corridaInicioAt   = null // start_at do turno em andamento (p/ modal finalizar)
let ultimoCpTs        = null // timestamp do último checkpoint (ou início do turno)
let lembreteTimer     = null // setTimeout do lembrete de 5 min

// Elementos
const btnAcao            = document.getElementById('btnAcao')
const btnProximoCorredor = document.getElementById('btnProximoCorredor')
const btnAbrirEsteiraEl  = document.getElementById('btnAbrirEsteira')
const inputKm            = document.getElementById('inputKm')
const cronometro         = document.getElementById('cronometro')
const corredorAtual      = document.getElementById('corredorAtual')
const tabela             = document.getElementById('tabelaRegistros')
const filaEl             = document.getElementById('fila')
const filaResumoEl       = document.getElementById('filaResumo')
const filaProximoNomeEl  = document.getElementById('filaProximoNome')
const filaTotalEl        = document.getElementById('filaTotal')
const btnOrganizarFila   = document.getElementById('btnOrganizarFila')

// ─── Cronômetro ───────────────────────────────────────────────
function formatarTempo(s) {
    const h = String(Math.floor(s / 3600)).padStart(2, '0')
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const seg = String(s % 60).padStart(2, '0')
    return `${h}:${m}:${seg}`
}

// Converte "HH:MM:SS" → segundos. Retorna null se inválido.
function parseTempo(str) {
    if (!str) return null
    const partes = str.trim().split(':')
    if (partes.length !== 3) return null
    const [h, m, s] = partes.map(Number)
    if ([h, m, s].some(isNaN) || m >= 60 || s >= 60 || h < 0 || m < 0 || s < 0) return null
    return h * 3600 + m * 60 + s
}

function iniciarTimer(inicial = 0) {
    segundos = inicial
    // Conta pelo relógio do tablet, não por soma de 1 em 1: com a tela apagada
    // ou a aba em segundo plano o navegador atrasa o setInterval e o tempo ficava errado.
    timerBase = Date.now() - inicial * 1000
    cronometro.textContent = formatarTempo(segundos)
    document.body.classList.add('corrida-ativa')
    if (typeof cronometroModal !== 'undefined' && cronometroModal) cronometroModal.textContent = formatarTempo(segundos)
    clearInterval(timerInterval)
    timerInterval = setInterval(() => {
        segundos = Math.max(0, Math.floor((Date.now() - timerBase) / 1000))
        cronometro.textContent = formatarTempo(segundos)
    }, 1000)
}

function pararTimer() {
    clearInterval(timerInterval)
    timerInterval = null
    document.body.classList.remove('corrida-ativa')
}

// ─── Ação principal (Iniciar / Registrar checkpoint) ──────────
async function acaoPrincipal() {
    if (!atletaAtual) {
        alert('Sem atletas na fila.')
        return
    }

    const bruto = inputKm.value.trim()

    if (!emCorrida) {
        // Km inicial: padrão 0 quando vazio; cliente pode informar outro
        const kmStart = bruto === '' ? 0 : parseFloat(bruto)
        if (isNaN(kmStart) || kmStart < 0) {
            alert('Insira um km inicial válido.')
            return
        }
        await iniciarCorrida(kmStart)
    } else {
        abrirModalCheckpoint()
    }
}

async function iniciarCorrida(kmStart) {
    // UI otimista: cronômetro começa imediatamente
    emCorrida = true
    iniciarTimer()
    btnAcao.textContent = 'Registrar checkpoint'
    btnAcao.disabled = true
    if (btnProximoCorredor) btnProximoCorredor.classList.remove('escondido')
    if (btnAbrirEsteiraEl)  btnAbrirEsteiraEl.classList.add('inativa')
    // Km do checkpoint agora vai no modal — esconde o campo durante a corrida
    inputKm.classList.add('escondido')
    inputKm.value = ''

    const clientId = novoId()
    const inicioMs = Date.now()
    const corpo = {
        athlete_id:    atletaAtual.id,
        auditor_id:    AUDITOR_ID,
        operator_role: OPERATOR_ROLE,
        treadmill_id:  TREADMILL_ID,
        km_start:      kmStart,
        client_id:     clientId,                          // reenvio nunca duplica o turno
        started_at:    new Date(inicioMs).toISOString(),  // horário real do início
    }

    // Se já há registros aguardando envio, este entra atrás deles (mantém a ordem)
    const r = filaTemPendencias()
        ? { rede: true }
        : await tentarEnvio('/audit/shifts/start', 'POST', corpo)

    btnAcao.disabled = false

    if (r.rede) {
        // Sem conexão: o turno segue valendo no tablet e é enviado depois
        enfileirar({ tipo: 'start', turno: clientId, corpo })
        shiftId = clientId
        kmInicioTurno = kmStart
        corridaInicioAt = new Date(inicioMs).toISOString()
        checkpointsSessao = []
        agendarLembrete()
        return
    }

    if (!r.ok) {
        reverterInicioNaTela(kmStart)
        const err = r.data || {}

        if (r.status === 409 && err.conflict_shift_id) {
            const inicio = err.conflict_start_at
                ? new Date(err.conflict_start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '?'
            const msg = `Turno ativo encontrado:\n` +
                        `Corredor: ${err.conflict_athlete || '?'}\n` +
                        `Esteira: ${err.conflict_treadmill || '?'}\n` +
                        `Início: ${inicio}\n\n` +
                        `Forçar encerramento e iniciar novo turno?`
            if (confirm(msg)) {
                await forcarEncerramento(err.conflict_shift_id)
                await iniciarCorrida(kmStart)
            }
            return
        }

        alert('Erro ao iniciar: ' + (err.error || 'tente novamente'))
        return false
    }

    const shift = r.data
    shiftId = shift.id
    kmInicioTurno = kmStart
    corridaInicioAt = shift.start_at
    checkpointsSessao = []
    agendarLembrete()
    salvarTurnoAtivo(shift.id, shift.start_at)
}

function reverterInicioNaTela(kmStart) {
    pararTimer()
    segundos = 0
    cronometro.textContent = '00:00:00'
    emCorrida = false
    shiftId = null
    btnAcao.textContent = 'Iniciar corrida'
    if (btnProximoCorredor) btnProximoCorredor.classList.add('escondido')
    if (btnAbrirEsteiraEl)  btnAbrirEsteiraEl.classList.remove('inativa')
    inputKm.classList.remove('escondido')
    inputKm.value = kmStart ?? ''
}

// Persiste referência do turno ativo no localStorage para recuperação
function salvarTurnoAtivo(id, startAt) {
    localStorage.setItem('activeShift', JSON.stringify({
        shiftId:     id,
        treadmillId: TREADMILL_ID,
        teamId:      typeof TEAM_ID !== 'undefined' ? TEAM_ID : null,
        eventId:     typeof EVENT_ID !== 'undefined' ? EVENT_ID : null,
        startAt,
    }))
}

// ─── Retorno dos registros que estavam guardados no tablet ────
function aoConfirmarInicio(idLocal, shift) {
    if (shiftId !== idLocal) return
    shiftId = shift.id
    salvarTurnoAtivo(shift.id, shift.start_at)
}

function aoRecusarInicio(idLocal, motivo) {
    if (shiftId !== idLocal) return
    cancelarLembrete()
    checkpointsSessao = []
    atualizarUltimoCp()
    reverterInicioNaTela(kmInicioTurno)
    alert('O servidor não aceitou o início deste turno:\n' + motivo +
          '\n\nOs valores ficaram guardados no aviso vermelho. Avise o gestor.')
}

function aoConfirmarCheckpoint(syncId, cp) {
    const local = checkpointsSessao.find(c => c.syncId === syncId)
    if (!local) return
    local.id = cp.id
    local.pendente = false
    renderizarCpsSessao()
}

async function forcarEncerramento(conflictId) {
    await authFetch(`/audit/shifts/${conflictId}/abandon`, {
        method: 'PATCH',
        body: JSON.stringify({ force_close: true })
    })
}

async function uploadFotoParaEntidade(tipo, id, arquivo) {
    const form = new FormData()
    form.append('image', arquivo)
    return authFetch(`/audit/${tipo}/${id}/image`, { method: 'PATCH', body: form })
}

function abrirLightbox(src) {
    const lb = document.createElement('div')
    lb.className = 'ocr-lightbox'
    lb.innerHTML = `
        <button class="ocr-lightbox-fechar" aria-label="Fechar">&times;</button>
        <img src="${src}" alt="Foto ampliada">
    `
    const fechar = () => document.body.removeChild(lb)
    lb.addEventListener('click', e => { if (e.target === lb) fechar() })
    lb.querySelector('.ocr-lightbox-fechar').addEventListener('click', fechar)
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { fechar(); document.removeEventListener('keydown', esc) }
    })
    document.body.appendChild(lb)
}

async function registrarCheckpoint(kmDistance) {
    const syncId = novoId()
    const agora  = Date.now()
    const corpo  = {
        distance:  kmDistance,
        type:      'voluntary',
        sync_id:   syncId,                          // reenvio nunca duplica o checkpoint
        timestamp: new Date(agora).toISOString(),   // horário real do registro
    }
    const nomeOperadorAtual = document.getElementById('nomeOperador')?.textContent?.trim() || '—'
    const idTurno = idServidorDoTurno(shiftId)

    const r = (filaTemPendencias() || idTurno == null)
        ? { rede: true }
        : await tentarEnvio(`/audit/shifts/${idTurno}/checkpoints`, 'POST', corpo)

    if (r.rede) {
        // Sem conexão: guarda no tablet e segue. O envio é automático.
        if (!enfileirar({ tipo: 'checkpoint', turno: shiftId, corpo })) return
        checkpointsSessao.push({ id: null, syncId, pendente: true, km: kmDistance, ts: agora, hora: new Date(agora).toLocaleTimeString('pt-BR'), auditor: nomeOperadorAtual })
    } else if (!r.ok) {
        alert('Erro ao registrar checkpoint: ' + (r.data?.error || 'tente novamente'))
        return
    } else {
        const cp = r.data
        checkpointsSessao.push({ id: cp.id, syncId, km: cp.distance, ts: new Date(cp.timestamp).getTime(), hora: new Date(cp.timestamp).toLocaleTimeString('pt-BR'), auditor: nomeOperadorAtual })
    }

    inputKm.value = ''
    atualizarUltimoCp()
    renderizarCpsSessao()
    agendarLembrete() // reinicia contagem de 5 min
    return true
}

// ─── Último checkpoint info ───────────────────────────────────
const ultimoCpInfoEl  = document.getElementById('ultimoCpInfo')
const ultimoCpValorEl = document.getElementById('ultimoCpValor')

function atualizarUltimoCp() {
    if (!ultimoCpInfoEl) return
    if (checkpointsSessao.length === 0) {
        ultimoCpInfoEl.classList.add('escondido')
        return
    }
    const ultimo = checkpointsSessao[checkpointsSessao.length - 1]
    if (ultimoCpValorEl) ultimoCpValorEl.textContent = `${ultimo.km} km · ${ultimo.hora}`
    ultimoCpInfoEl.classList.remove('escondido')
}

// ─── Lembrete 5 minutos ───────────────────────────────────────
const modalLembreteCP    = document.getElementById('modalLembreteCP')
const btnLembreteMaisTarde = document.getElementById('btnLembreteMaisTarde')
const btnLembreteAgora   = document.getElementById('btnLembreteAgora')
const LEMBRETE_MS = 5 * 60 * 1000 // 5 minutos

function agendarLembrete() {
    cancelarLembrete()
    lembreteTimer = setTimeout(() => {
        if (emCorrida && modalLembreteCP) {
            modalLembreteCP.classList.remove('escondido')
        }
    }, LEMBRETE_MS)
}

function cancelarLembrete() {
    if (lembreteTimer) { clearTimeout(lembreteTimer); lembreteTimer = null }
}

if (btnLembreteMaisTarde) {
    btnLembreteMaisTarde.addEventListener('click', () => {
        modalLembreteCP?.classList.add('escondido')
        agendarLembrete() // reagenda para mais 5 min
    })
}

if (btnLembreteAgora) {
    btnLembreteAgora.addEventListener('click', () => {
        modalLembreteCP?.classList.add('escondido')
        abrirModalCheckpoint()
    })
}

// ─── Modal Checkpoint ─────────────────────────────────────────
const modalCheckpoint       = document.getElementById('modalCheckpoint')
const kmCheckpointModal     = document.getElementById('kmCheckpointModal')
const tempoCheckpointModal  = document.getElementById('tempoCheckpointModal')
const velocidadeCheckpointModal = document.getElementById('velocidadeCheckpointModal')
const corredorCheckpointModal = document.getElementById('corredorCheckpointModal')
const checkpointFotoInput   = document.getElementById('checkpointFotoInput')
const checkpointFotoPreview = document.getElementById('checkpointFotoPreview')
const btnCheckpointFoto     = document.getElementById('btnCheckpointFoto')
const listaCpsSessao        = document.getElementById('listaCpsSessao')
const btnCancelarCheckpoint = document.getElementById('btnCancelarCheckpoint')
const btnRegistrarCheckpoint = document.getElementById('btnRegistrarCheckpoint')
let checkpointFotoUrl = null

function renderizarCpsSessao() {
    if (!listaCpsSessao) return
    if (checkpointsSessao.length === 0) {
        listaCpsSessao.innerHTML = '<p class="cps-vazio">Nenhum checkpoint ainda</p>'
        return
    }
    listaCpsSessao.innerHTML = [...checkpointsSessao]
        .slice().reverse()
        .map((cp, i) => {
            const num = checkpointsSessao.length - i
            const cpId = cp.id ?? ''
            return `
            <div class="cp-sessao-item" data-cp-idx="${checkpointsSessao.length - 1 - i}">
                <span class="cp-num">${num}</span>
                <span class="cp-km cp-km-valor">${cp.km} km</span>
                <input class="cp-km-input input-km escondido" type="number" min="0" step="0.1" value="${cp.km}" style="width:80px">
                <span class="cp-hora">${cp.hora}</span>
                <button class="cp-btn-editar" type="button" title="Editar km" data-cpid="${cpId}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="cp-btn-salvar escondido" type="button" title="Salvar">✓</button>
            </div>`
        }).join('')

    // Wiring dos botões de edição inline
    listaCpsSessao.querySelectorAll('.cp-btn-editar').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.cp-sessao-item')
            item.querySelector('.cp-km-valor').classList.add('escondido')
            item.querySelector('.cp-km-input').classList.remove('escondido')
            item.querySelector('.cp-km-input').focus()
            btn.classList.add('escondido')
            item.querySelector('.cp-btn-salvar').classList.remove('escondido')
        })
    })

    listaCpsSessao.querySelectorAll('.cp-btn-salvar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const item  = btn.closest('.cp-sessao-item')
            const idx   = Number(item.dataset.cpIdx)
            const input = item.querySelector('.cp-km-input')
            const novoKm = parseFloat(input.value)
            if (isNaN(novoKm) || novoKm < 0) { input.focus(); return }
            const cp = checkpointsSessao[idx]
            if (!cp?.id) {
                alert('Este checkpoint ainda não foi enviado ao servidor. A correção fica disponível assim que a conexão voltar.')
                return
            }
            btn.disabled = true
            const res = await authFetch(`/audit/checkpoints/${cp.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ distance: novoKm })
            })
            btn.disabled = false
            if (!res || !res.ok) {
                const err = res ? await res.json() : {}
                alert(err.error || 'Erro ao salvar.')
                return
            }
            cp.km = novoKm
            atualizarUltimoCp()
            renderizarCpsSessao()
        })
    })
}

function abrirModalCheckpoint() {
    if (!modalCheckpoint) return
    if (kmCheckpointModal) { kmCheckpointModal.value = ''; }
    if (tempoCheckpointModal) tempoCheckpointModal.value = formatarTempo(segundos)
    if (velocidadeCheckpointModal) velocidadeCheckpointModal.value = ''
    if (corredorCheckpointModal) {
        const option = document.createElement('option')
        option.textContent = atletaAtual?.name || 'Corredor atual'
        corredorCheckpointModal.replaceChildren(option)
    }
    renderizarCpsSessao()
    modalCheckpoint.classList.remove('escondido')
}

function fecharModalCheckpoint() {
    if (modalCheckpoint) modalCheckpoint.classList.add('escondido')
    if (checkpointFotoUrl) {
        URL.revokeObjectURL(checkpointFotoUrl)
        checkpointFotoUrl = null
    }
    if (checkpointFotoInput) checkpointFotoInput.value = ''
    if (checkpointFotoPreview) {
        checkpointFotoPreview.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h3l1.5-2h7L17 7h3v12H4z"></path>
                <circle cx="12" cy="13" r="4"></circle>
            </svg>`
    }
}

if (btnCheckpointFoto && checkpointFotoInput) {
    btnCheckpointFoto.addEventListener('click', () => checkpointFotoInput.click())
}

if (checkpointFotoInput && checkpointFotoPreview) {
    checkpointFotoInput.addEventListener('change', async () => {
        const arquivo = checkpointFotoInput.files?.[0]
        if (!arquivo) return
        if (checkpointFotoUrl) URL.revokeObjectURL(checkpointFotoUrl)
        checkpointFotoUrl = URL.createObjectURL(arquivo)
        checkpointFotoPreview.innerHTML = `<img src="${checkpointFotoUrl}" alt="Foto do checkpoint" style="cursor:zoom-in">`
        checkpointFotoPreview.querySelector('img').addEventListener('click', () => abrirLightbox(checkpointFotoUrl))

        if (btnCheckpointFoto) btnCheckpointFoto.disabled = true
        checkpointFotoPreview.classList.add('ocr-loading')
        try {
            const form = new FormData()
            form.append('image', arquivo)
            const res = await authFetch('/audit/ocr', { method: 'POST', body: form })
            if (res && res.ok) {
                const { ocr } = await res.json()
                if (ocr) {
                    if (ocr.distance != null && kmCheckpointModal)          kmCheckpointModal.value = ocr.distance
                    if (ocr.speed    != null && velocidadeCheckpointModal)  velocidadeCheckpointModal.value = ocr.speed
                    if (ocr.time     != null && tempoCheckpointModal)       tempoCheckpointModal.value = ocr.time
                }
            }
        } finally {
            checkpointFotoPreview.classList.remove('ocr-loading')
            if (btnCheckpointFoto) btnCheckpointFoto.disabled = false
        }
    })
}

if (modalCheckpoint) {
    modalCheckpoint.addEventListener('click', (e) => {
        if (e.target === modalCheckpoint) fecharModalCheckpoint()
    })
}
if (btnCancelarCheckpoint) btnCancelarCheckpoint.addEventListener('click', fecharModalCheckpoint)

if (btnRegistrarCheckpoint) {
    btnRegistrarCheckpoint.addEventListener('click', async () => {
        const km = parseFloat(kmCheckpointModal?.value)
        if (isNaN(km) || km < 0) {
            alert('Insira um km válido.')
            kmCheckpointModal?.focus()
            return
        }

        // Verifica se km é menor que o último checkpoint registrado
        if (checkpointsSessao.length > 0) {
            const ultimo = checkpointsSessao[checkpointsSessao.length - 1]
            if (km < ultimo.km) {
                const ant = document.getElementById('valorKmAnteriorAviso')
                const inf = document.getElementById('valorKmInformadoAviso')
                if (ant) ant.textContent = `${ultimo.km} km`
                if (inf) inf.textContent = `${km} km`
                const modal = document.getElementById('modalKmMenorAviso')
                if (modal) modal.classList.remove('escondido')
                return
            }
        }

        btnRegistrarCheckpoint.disabled = true
        const registrado = await registrarCheckpoint(km)
        btnRegistrarCheckpoint.disabled = false
        if (registrado) fecharModalCheckpoint()
    })
}

// ─── Modal km menor que anterior ──────────────────────────────
;(function () {
    const modal   = document.getElementById('modalKmMenorAviso')
    const btnCanc = document.getElementById('btnCancelarKmMenorAviso')
    const btnCorr = document.getElementById('btnCorrigirKmMenorAviso')
    if (!modal) return

    function fechar() { modal.classList.add('escondido') }

    if (btnCanc) btnCanc.addEventListener('click', () => {
        fechar()
        setTimeout(() => kmCheckpointModal?.focus(), 50)
    })

    if (btnCorr) btnCorr.addEventListener('click', () => {
        fechar()
        abrirModalCheckpoint()
    })

    modal.addEventListener('click', e => { if (e.target === modal) fechar() })
})()

async function finalizarCorrida(kmEnd, athleteIdOverride = null, durationSeconds = null, pace = null) {
    const body = { km_end: kmEnd, finish_id: novoId() }  // reenvio nunca aplica o fim duas vezes
    // Troca de corredor: só envia se diferir do atleta atual do turno
    if (athleteIdOverride && (!atletaAtual || athleteIdOverride !== atletaAtual.id)) {
        body.athlete_id = athleteIdOverride
    }
    // Tempo editado: envia duração em segundos; backend faz end_at = start_at + duração no SQL
    if (durationSeconds != null) body.duration_seconds = durationSeconds
    if (pace) body.pace = pace

    const idTurno = idServidorDoTurno(shiftId)
    const r = (filaTemPendencias() || idTurno == null)
        ? { rede: true }
        : await tentarEnvio(`/audit/shifts/${idTurno}/finish`, 'PATCH', body)

    let shift
    if (r.rede) {
        // Sem conexão: o servidor não pode validar agora, então conferimos aqui
        const ultimoCp = checkpointsSessao[checkpointsSessao.length - 1]
        if (kmEnd < kmInicioTurno) { alert('Erro ao finalizar: km final menor que o km inicial.'); return }
        if (ultimoCp && kmEnd < Number(ultimoCp.km)) { alert('Erro ao finalizar: km final menor que o último checkpoint.'); return }

        // Sem duração explícita o servidor usaria a hora do reenvio, não a do fim real
        if (body.duration_seconds == null || !(body.duration_seconds > 0)) body.duration_seconds = Math.max(1, segundos)
        if (!enfileirar({ tipo: 'finish', turno: shiftId, corpo: body })) return

        const inicioMs = corridaInicioAt ? new Date(corridaInicioAt).getTime() : Date.now() - body.duration_seconds * 1000
        shift = {
            km_start: kmInicioTurno,
            km_end:   kmEnd,
            pace:     body.pace || null,
            start_at: new Date(inicioMs).toISOString(),
            end_at:   new Date(inicioMs + body.duration_seconds * 1000).toISOString(),
        }
    } else if (!r.ok) {
        alert('Erro ao finalizar: ' + (r.data?.error || 'tente novamente'))
        return
    } else {
        shift = r.data
    }

    pararTimer()

    // Nome do corredor a registrar (respeita a troca, se houve)
    const corredorFinal = ATHLETES.find(a => a.id === (body.athlete_id ?? atletaAtual?.id)) || atletaAtual
    const nomeCorredorFinal = corredorFinal ? corredorFinal.name : (atletaAtual ? atletaAtual.name : '—')

    // Adiciona linha na tabela (com checkpoints)
    const nomeOperadorAtual = document.getElementById('nomeOperador')?.textContent?.trim() || '—'
    adicionarLinhaTabela(shift, nomeCorredorFinal, [...checkpointsSessao], nomeOperadorAtual)
    checkpointsSessao = []
    cancelarLembrete()
    modalLembreteCP?.classList.add('escondido')
    atualizarUltimoCp()

    // Próximo atleta
    atletaIndex++
    atletaAtual = ATHLETES[atletaIndex] || null

    emCorrida = false
    shiftId = null
    corridaInicioAt = null
    segundos = 0
    cronometro.textContent = '00:00:00'
    btnAcao.textContent = 'Iniciar corrida'
    if (btnProximoCorredor) btnProximoCorredor.classList.add('escondido')
    if (btnAbrirEsteiraEl)  btnAbrirEsteiraEl.classList.remove('inativa')
    inputKm.classList.remove('escondido')
    inputKm.value = ''
    localStorage.removeItem('activeShift')

    if (atletaAtual) {
        corredorAtual.textContent = atletaAtual.name
        atualizarFila()
    } else {
        corredorAtual.textContent = '— Fim da fila —'
        btnAcao.disabled = true
        if (btnProximoCorredor) btnProximoCorredor.disabled = true
    }
}

// ─── Tabela de registros ──────────────────────────────────────
let _rowCounter = 0
function adicionarLinhaTabela(shift, nomeAtleta, checkpoints, auditor) {
    const temCps = checkpoints.length > 0
    const rowId  = `cps-${++_rowCounter}`

    const tr = document.createElement('tr')
    tr.className = 'linha-turno registro-novo'
    tr.innerHTML = `
        <td>
            ${temCps ? `<button class="btn-toggle-cp" data-target="${rowId}" onclick="toggleCheckpoints(this)">▶</button>` : ''}
            ${nomeAtleta}
        </td>
        <td>${shift.km_start} km</td>
        <td>${shift.km_end} km</td>
        <td>${shift.pace || '—'}</td>
        <td>${new Date(shift.start_at).toLocaleTimeString('pt-BR')}</td>
        <td>${new Date(shift.end_at).toLocaleTimeString('pt-BR')}</td>
        <td>${auditor || '—'}</td>
    `
    tabela.prepend(tr)

    if (temCps) {
        const trCps = document.createElement('tr')
        trCps.id = rowId
        trCps.className = 'linha-checkpoints escondido'
        trCps.innerHTML = `
            <td colspan="6" style="padding:0">
                <table class="tabela-checkpoints">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Km</th>
                            <th>Hora</th>
                            <th>Auditor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[...checkpoints].sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)).map((cp, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${cp.km} km</td>
                                <td>${cp.hora}</td>
                                <td>${cp.auditor || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </td>
        `
        tabela.insertBefore(trCps, tr.nextSibling)
    }
}

function toggleCheckpoints(btn) {
    const target = document.getElementById(btn.dataset.target)
    if (!target) return
    const aberto = !target.classList.contains('escondido')
    target.classList.toggle('escondido', aberto)
    btn.textContent = aberto ? '▶' : '▼'
}

async function carregarHistorico() {
    if (!EVENT_ID || !TEAM_ID) return
    try {
        const entries = HISTORY_ENTRIES || []

        // Agrupar por shift_id
        const shifts = {}
        for (const e of entries) {
            if (!shifts[e.shift_id]) shifts[e.shift_id] = { shift: null, checkpoints: [] }
            if (e.entry_type === 'shift_start') {
                shifts[e.shift_id].shift = e
            } else if (e.entry_type === 'checkpoint') {
                shifts[e.shift_id].checkpoints.push({
                    km:      e.distance,
                    hora:    new Date(e.timestamp).toLocaleTimeString('pt-BR'),
                    auditor: e.auditor_name || '—'
                })
            }
        }

        // Ordena por início ascendente; prepend joga o mais novo pro topo
        const ordered = Object.values(shifts)
            .filter(s => s.shift)
            .sort((a, b) => new Date(a.shift.timestamp).getTime() - new Date(b.shift.timestamp).getTime())
        for (const { shift, checkpoints } of ordered) {
            adicionarLinhaTabela(
                {
                    km_start: shift.km_start,
                    km_end:   shift.km_end,
                    start_at: shift.timestamp,
                    end_at:   shift.end_at,
                },
                shift.athlete_name,
                checkpoints,
                shift.auditor_name
            )
        }
    } catch(e) { console.error('Erro ao carregar histórico:', e) }
}

carregarHistorico()

function criarItemFila(athlete) {
    const div = document.createElement('div')
    div.className = 'corredor-fila'
    div.draggable = true
    div.dataset.id = athlete.id
    div.title = 'Arraste para reorganizar a fila'
    div.innerHTML = `
        <span class="avatar" ${athlete.image_url ? `style="background-image:url('${athlete.image_url}');background-size:cover;background-position:center;"` : ''}></span>
        <p>${athlete.name}</p>
        <span class="drag">⠿</span>
    `
    ativarDrag(div)
    return div
}

function atualizarResumoFila() {
    if (!filaProximoNomeEl || !filaTotalEl) return
    const proximos = ATHLETES.slice(atletaIndex + 1)
    filaProximoNomeEl.textContent = proximos[0] ? proximos[0].name : 'Fim da fila'
    filaTotalEl.textContent = `${proximos.length} na fila`
}

function atualizarFila() {
    const fila = filaEl || document.getElementById('fila')
    if (!fila) return
    fila.innerHTML = ''
    ATHLETES.slice(atletaIndex + 1).forEach(athlete => {
        fila.appendChild(criarItemFila(athlete))
    })
    atualizarResumoFila()
}

if (btnOrganizarFila && filaResumoEl && filaEl) {
    btnOrganizarFila.addEventListener('click', () => {
        const aberta = filaResumoEl.classList.toggle('fila-aberta')
        filaEl.classList.toggle('fila-aberta', aberta)
        btnOrganizarFila.textContent = aberta ? 'Fechar fila' : 'Organizar fila'
    })
}

// ─── Drag & Drop ──────────────────────────────────────────────
let dragging = null

function ativarDrag(el) {
    el.addEventListener('dragstart', () => {
        dragging = el
        setTimeout(() => el.classList.add('arrastando'), 0)
    })

    el.addEventListener('dragend', () => {
        dragging = null
        el.classList.remove('arrastando')
        // Sincroniza ATHLETES com nova ordem visual
        const fila = filaEl || document.getElementById('fila')
        const novaOrdem = [...fila.querySelectorAll('.corredor-fila')].map(d => {
            return ATHLETES.find(a => String(a.id) === d.dataset.id)
        }).filter(Boolean)
        // Substitui a fatia restante do array
        novaOrdem.forEach((a, i) => { ATHLETES[atletaIndex + 1 + i] = a })
        atualizarResumoFila()
    })

    el.addEventListener('dragover', (e) => {
        e.preventDefault()
        if (!dragging || dragging === el) return
        const fila = filaEl || document.getElementById('fila')
        const items = [...fila.querySelectorAll('.corredor-fila')]
        const indexDragging = items.indexOf(dragging)
        const indexTarget   = items.indexOf(el)
        if (indexDragging < indexTarget) {
            fila.insertBefore(dragging, el.nextSibling)
        } else {
            fila.insertBefore(dragging, el)
        }
    })
}

// Ativa drag nos itens do SSR (renderizados pelo EJS)
document.querySelectorAll('#fila .corredor-fila').forEach(el => ativarDrag(el))
atualizarResumoFila()

// ─── Turno aberto ao carregar: RETOMA (não encerra) ───────────
if (OPEN_SHIFT) {
    shiftId   = OPEN_SHIFT.id
    kmInicioTurno = Number(OPEN_SHIFT.km_start) || 0
    emCorrida = true
    corridaInicioAt = OPEN_SHIFT.start_at
    checkpointsSessao = []

    // Localiza o corredor do turno na fila
    const idx = ATHLETES.findIndex(a => a.id === OPEN_SHIFT.athlete_id)
    if (idx >= 0) {
        atletaIndex = idx
        atletaAtual = ATHLETES[idx]
        corredorAtual.textContent = atletaAtual.name
    }

    // Cronômetro retoma do tempo decorrido (calculado no servidor, sem TZ)
    const decorrido = Math.max(0, Number(OPEN_SHIFT.elapsed_seconds) || 0)
    iniciarTimer(decorrido)
    agendarLembrete() // inicia contagem de 5 min ao retomar turno

    // UI de corrida em andamento
    btnAcao.textContent = 'Registrar checkpoint'
    if (btnProximoCorredor) btnProximoCorredor.classList.remove('escondido')
    if (btnAbrirEsteiraEl)  btnAbrirEsteiraEl.classList.add('inativa')
    // Km do checkpoint agora vai no modal — esconde o campo durante a corrida
    inputKm.classList.add('escondido')
    inputKm.value = ''

    // Re-persiste activeShift caso a aba seja fechada de novo
    localStorage.setItem('activeShift', JSON.stringify({
        shiftId:     OPEN_SHIFT.id,
        treadmillId: TREADMILL_ID,
        teamId:      typeof TEAM_ID !== 'undefined' ? TEAM_ID : null,
        eventId:     typeof EVENT_ID !== 'undefined' ? EVENT_ID : null,
        startAt:     OPEN_SHIFT.start_at,
    }))

    // Recupera checkpoints já registrados do turno (p/ tabela ficar completa)
    ;(async () => {
        const res = await authFetch(`/audit/shifts/${OPEN_SHIFT.id}/checkpoints`)
        if (!res || !res.ok) return
        const cps = await res.json()
        checkpointsSessao = cps.map(c => ({
            id:      c.id,
            km:      c.distance,
            ts:      new Date(c.timestamp).getTime(),
            hora:    new Date(c.timestamp).toLocaleTimeString('pt-BR'),
            auditor: c.auditor_name || '—'
        }))
    })()
}

// ─── Fechar turno ao sair da página ───────────────────────────

// beforeunload: avisa, mas NÃO encerra o turno.
// Turno permanece in_progress + activeShift persiste no localStorage,
// para que ao reabrir o site apareça a opção de retomar o turno.
window.addEventListener('beforeunload', (e) => {
    if (recarregandoTela) return
    if (!(emCorrida && shiftId) && !filaTemPendencias()) return
    e.preventDefault()
    e.returnValue = 'Há uma corrida em andamento. Você poderá retomá-la ao reabrir o site.'
})

// ─── Finalizar competição (PR #219) ───────────────────────────
// btn-sair (↪) abre o modal estilizado em vez do confirm() nativo.
const btnSair = document.querySelector('.btn-sair')
const modalFinalizarCompeticao   = document.getElementById('modalFinalizarCompeticao')
const btnCancelarFinalizarComp   = document.getElementById('btnCancelarFinalizarCompeticao')
const btnConfirmarFinalizarComp  = document.getElementById('btnConfirmarFinalizarCompeticao')

function abrirModalFinalizarCompeticao() {
    if (modalFinalizarCompeticao) modalFinalizarCompeticao.classList.remove('escondido')
}
function fecharModalFinalizarCompeticao() {
    if (modalFinalizarCompeticao) modalFinalizarCompeticao.classList.add('escondido')
}

if (btnSair) {
    btnSair.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        abrirModalFinalizarCompeticao()
    }, { capture: true })
}

if (btnCancelarFinalizarComp) {
    btnCancelarFinalizarComp.addEventListener('click', fecharModalFinalizarCompeticao)
}

if (modalFinalizarCompeticao) {
    modalFinalizarCompeticao.addEventListener('click', (e) => {
        if (e.target === modalFinalizarCompeticao) fecharModalFinalizarCompeticao()
    })
}

if (btnConfirmarFinalizarComp) {
    btnConfirmarFinalizarComp.addEventListener('click', () => {
        btnConfirmarFinalizarComp.disabled = true

        // Encerra turno em andamento antes de sair
        if (filaTemPendencias() &&
            !confirm('Há registros guardados no tablet que ainda não foram enviados.\n' +
                     'Eles continuam guardados e serão enviados quando esta tela for aberta de novo com internet.\n\nSair mesmo assim?')) {
            btnConfirmarFinalizarComp.disabled = false
            return
        }
        if (emCorrida && typeof shiftId === 'number') {
            navigator.sendBeacon(
                `/audit/shifts/${shiftId}/abandon`,
                new Blob([JSON.stringify({ force_close: true })], { type: 'application/json' })
            )
        }
        window.location.href = (btnSair && btnSair.dataset.href) || '/home'
    })
}

// ─── Próximo corredor ─────────────────────────────────────────
if (btnProximoCorredor) {
    btnProximoCorredor.addEventListener('click', () => {
        if (!emCorrida || !shiftId) return
        abrirModalTurno()
    })
}

// ─── Modal Finalizar Turno ────────────────────────────────────
const modalTurno              = document.getElementById('modalTurno')
const selectCorredor          = document.getElementById('selectCorredor')
const inicioTurno             = document.getElementById('inicioTurno')
const fimTurno                = document.getElementById('fimTurno')
const tempoPercorridoTurno    = document.getElementById('tempoPercorridoTurno')
const quilometragemTurno      = document.getElementById('quilometragemTurno')
const btnRegistrarTurno       = document.getElementById('btnRegistrarTurno')
const btnCancelarTurno        = document.getElementById('btnCancelarTurno')
const finalizarTurnoFotoInput   = document.getElementById('finalizarTurnoFotoInput')
const finalizarTurnoFotoPreview = document.getElementById('finalizarTurnoFotoPreview')
const btnFinalizarTurnoFoto     = document.getElementById('btnFinalizarTurnoFoto')
const ocrResultadoTurno         = document.getElementById('ocrResultadoTurno')
const ocrSpeedEl                = document.getElementById('ocrSpeed')
const ocrDistanceEl             = document.getElementById('ocrDistance')
const ocrPaceEl                 = document.getElementById('ocrPace')
const ocrTimeEl                 = document.getElementById('ocrTime')
let finalizarTurnoFotoUrl = null

function limparFotoFinalizarTurno() {
    if (finalizarTurnoFotoUrl) { URL.revokeObjectURL(finalizarTurnoFotoUrl); finalizarTurnoFotoUrl = null }
    if (finalizarTurnoFotoInput) finalizarTurnoFotoInput.value = ''
    if (btnFinalizarTurnoFoto) btnFinalizarTurnoFoto.textContent = 'Tirar foto'
    if (ocrResultadoTurno) ocrResultadoTurno.classList.add('escondido')
    if (finalizarTurnoFotoPreview) {
        finalizarTurnoFotoPreview.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h3l1.5-2h7L17 7h3v12H4z"></path>
                <circle cx="12" cy="13" r="4"></circle>
            </svg>`
    }
}

function exibirOcrTurno(ocr) {
    if (!ocrResultadoTurno) return
    if (!ocr) { ocrResultadoTurno.classList.add('escondido'); return }
    if (ocrSpeedEl)    ocrSpeedEl.textContent    = ocr.speed    != null ? `${ocr.speed} km/h` : '—'
    if (ocrDistanceEl) ocrDistanceEl.textContent = ocr.distance != null ? `${ocr.distance} km` : '—'
    if (ocrPaceEl)     ocrPaceEl.textContent     = ocr.pace     ?? '—'
    if (ocrTimeEl)     ocrTimeEl.textContent     = ocr.time     ?? '—'
    ocrResultadoTurno.classList.remove('escondido')

    const quilometragemTurno   = document.getElementById('quilometragemTurno')
    const tempoPercorridoTurno = document.getElementById('tempoPercorridoTurno')
    const paceTurno            = document.getElementById('paceTurno')
    if (ocr.distance != null && quilometragemTurno)   quilometragemTurno.value   = ocr.distance
    if (ocr.time     != null && tempoPercorridoTurno) tempoPercorridoTurno.value = ocr.time
    if (ocr.pace     != null && paceTurno)            paceTurno.value            = ocr.pace
}

if (btnFinalizarTurnoFoto && finalizarTurnoFotoInput) {
    btnFinalizarTurnoFoto.addEventListener('click', () => finalizarTurnoFotoInput.click())
}

if (finalizarTurnoFotoInput && finalizarTurnoFotoPreview) {
    finalizarTurnoFotoInput.addEventListener('change', async () => {
        const arquivo = finalizarTurnoFotoInput.files?.[0]
        if (!arquivo) return
        if (finalizarTurnoFotoUrl) URL.revokeObjectURL(finalizarTurnoFotoUrl)
        finalizarTurnoFotoUrl = URL.createObjectURL(arquivo)
        finalizarTurnoFotoPreview.innerHTML =
            `<img src="${finalizarTurnoFotoUrl}" alt="Foto da finalização do turno" style="cursor:zoom-in">`
        finalizarTurnoFotoPreview.querySelector('img')?.addEventListener('click', () => abrirLightbox(finalizarTurnoFotoUrl))
        if (btnFinalizarTurnoFoto) btnFinalizarTurnoFoto.textContent = 'Tirar nova foto'

        if (typeof shiftId !== 'number') return  // turno ainda só no tablet: sem envio de foto
        if (btnFinalizarTurnoFoto) btnFinalizarTurnoFoto.disabled = true
        finalizarTurnoFotoPreview.classList.add('ocr-loading')
        try {
            const res = await uploadFotoParaEntidade('shifts', shiftId, arquivo)
            if (res && res.ok) {
                const data = await res.json()
                exibirOcrTurno(data.ocr)
            }
        } finally {
            finalizarTurnoFotoPreview.classList.remove('ocr-loading')
            if (btnFinalizarTurnoFoto) btnFinalizarTurnoFoto.disabled = false
        }
    })
}

function abrirModalTurno() {
    if (!modalTurno) return

    // Corredor: editável — permite corrigir a quem o turno pertence
    selectCorredor.innerHTML = ATHLETES
        .map(a => `<option value="${a.id}"${atletaAtual && a.id === atletaAtual.id ? ' selected' : ''}>${a.name}</option>`)
        .join('')

    // Tempo percorrido: editável (input de texto HH:MM:SS)
    if (tempoPercorridoTurno) tempoPercorridoTurno.value = formatarTempo(segundos)

    // Relação de horários abaixo (contexto): início do turno e agora
    const fmtHora = { hour: '2-digit', minute: '2-digit', second: '2-digit' }
    inicioTurno.textContent = corridaInicioAt
        ? new Date(corridaInicioAt).toLocaleTimeString('pt-BR', fmtHora)
        : '—'
    fimTurno.textContent = new Date().toLocaleTimeString('pt-BR', fmtHora)

    // Máscara HH:MM:SS + atualiza "Fim" dinamicamente
    tempoPercorridoTurno.oninput = (e) => {
        // Remove tudo que não é dígito, limita a 6 dígitos
        const digits = tempoPercorridoTurno.value.replace(/\D/g, '').slice(0, 6)
        // Formata: HH:MM:SS conforme digita
        let masked = digits
        if (digits.length > 4) masked = digits.slice(0, 2) + ':' + digits.slice(2, 4) + ':' + digits.slice(4)
        else if (digits.length > 2) masked = digits.slice(0, 2) + ':' + digits.slice(2)
        tempoPercorridoTurno.value = masked

        const secs = parseTempo(masked.length === 8 ? masked : null)
        if (secs != null && corridaInicioAt) {
            const fim = new Date(new Date(corridaInicioAt).getTime() + secs * 1000)
            fimTurno.textContent = fim.toLocaleTimeString('pt-BR', fmtHora)
        }
    }

    // Km final: pré-preenche com km do último checkpoint, se houver
    const ultimoCp = checkpointsSessao[checkpointsSessao.length - 1] || null
    quilometragemTurno.value = ultimoCp ? ultimoCp.km : (inputKm.value || '')

    const paceTurno = document.getElementById('paceTurno')
    if (paceTurno) paceTurno.value = ''

    modalTurno.classList.remove('escondido')
    setTimeout(() => quilometragemTurno.focus(), 50)
}

function fecharModalTurno() {
    if (modalTurno) modalTurno.classList.add('escondido')
    limparFotoFinalizarTurno()
}

if (modalTurno) {
    modalTurno.addEventListener('click', (e) => {
        if (e.target === modalTurno) fecharModalTurno()
    })
}
if (btnCancelarTurno) btnCancelarTurno.addEventListener('click', fecharModalTurno)

if (btnRegistrarTurno) {
    btnRegistrarTurno.addEventListener('click', async () => {
        const kmValor = parseFloat(quilometragemTurno.value)
        if (isNaN(kmValor) || kmValor < 0) {
            alert('Insira o km final válido.')
            quilometragemTurno.focus()
            return
        }

        // Tempo editado → envia duração em segundos (backend calcula end_at = start_at + duração)
        const secsEditado = parseTempo(tempoPercorridoTurno.value)

        const paceTurno = document.getElementById('paceTurno')
        const paceValor = paceTurno?.value.trim() || null

        const athleteId = Number(selectCorredor.value) || null
        btnRegistrarTurno.disabled = true
        await finalizarCorrida(kmValor, athleteId, secsEditado, paceValor)
        btnRegistrarTurno.disabled = false
        fecharModalTurno()
    })
}

// ─── Modal Esteira ────────────────────────────────────────────
const modalEsteira         = document.getElementById('modalEsteira')
const btnCancelarEsteira   = document.getElementById('btnCancelarEsteira')
const btnSelecionarEsteira = document.getElementById('btnSelecionarEsteira')
const labelEsteira         = document.getElementById('labelEsteira')
const opcoesEsteira        = document.querySelectorAll('.opcao-esteira')

let esteiraSelecionadaId     = TREADMILL_ID
let esteiraSelecionadaNumber = labelEsteira ? labelEsteira.textContent : ''

function abrirModalEsteira() {
    if (emCorrida) return  // bloqueado durante corrida

    // Marca a esteira atual como selecionada
    opcoesEsteira.forEach(op => {
        op.classList.toggle('selecionada', Number(op.dataset.id) === TREADMILL_ID)
    })
    esteiraSelecionadaId     = TREADMILL_ID
    esteiraSelecionadaNumber = labelEsteira ? labelEsteira.textContent : ''
    modalEsteira.classList.remove('escondido')
}

function fecharModalEsteira() {
    modalEsteira.classList.add('escondido')
}

opcoesEsteira.forEach(op => {
    op.addEventListener('click', () => {
        opcoesEsteira.forEach(o => o.classList.remove('selecionada'))
        op.classList.add('selecionada')
        esteiraSelecionadaId     = Number(op.dataset.id)
        esteiraSelecionadaNumber = op.dataset.number
    })
})

btnCancelarEsteira.addEventListener('click', fecharModalEsteira)

btnSelecionarEsteira.addEventListener('click', () => {
    TREADMILL_ID = esteiraSelecionadaId
    if (labelEsteira) labelEsteira.textContent = esteiraSelecionadaNumber
    fecharModalEsteira()
})

modalEsteira.addEventListener('click', e => {
    if (e.target === modalEsteira) fecharModalEsteira()
})

// ─── Troca de operador ───────────────────────────────────────
const modalOperador       = document.getElementById('modalOperador')
const modalOperadorOverlay = document.getElementById('modalOperadorOverlay')
const perfisGrid          = document.getElementById('perfisGrid')
const modalOpSenha        = document.getElementById('modalOpSenha')
const labelSenhaOperador  = document.getElementById('labelSenhaOperador')
const inputSenhaOperador  = document.getElementById('inputSenhaOperador')

let operadorSelecionado = null  // { id, name, email }
let todosAuditores = []

async function abrirModalOperador() {
    document.body.style.overflow = 'hidden'
    modalOperadorOverlay.classList.remove('escondido')
    modalOperador.classList.remove('escondido')
    modalOpSenha.classList.add('escondido')
    operadorSelecionado = null

    if (todosAuditores.length === 0) {
        const res = await fetch('/auth/auditors')
        todosAuditores = await res.json()
    }

    perfisGrid.innerHTML = ''
    todosAuditores.forEach(a => {
        const card = document.createElement('div')
        card.className = 'perfil-card' + (a.id === AUDITOR_ID ? ' selecionado' : '')
        card.innerHTML = `
            <div class="perfil-avatar"${a.image_url ? ` style="background-image:url('${a.image_url}')"` : ''}></div>
            <span class="perfil-nome">${a.name}</span>
        `
        card.addEventListener('click', () => selecionarOperador(a, card))
        perfisGrid.appendChild(card)
    })
}

function fecharModalOperador() {
    document.body.style.overflow = ''
    modalOperador.classList.add('escondido')
    modalOperadorOverlay.classList.add('escondido')
    inputSenhaOperador.value = ''
    operadorSelecionado = null
}

function selecionarOperador(auditor, card) {
    if (auditor.id === AUDITOR_ID) return  // já é o atual
    operadorSelecionado = auditor
    perfisGrid.querySelectorAll('.perfil-card').forEach(c => c.classList.remove('selecionado'))
    card.classList.add('selecionado')
    labelSenhaOperador.textContent = `Senha de ${auditor.name}`
    inputSenhaOperador.value = ''
    modalOpSenha.classList.remove('escondido')
    setTimeout(() => inputSenhaOperador.focus(), 50)
}

function voltarPickerOperador() {
    modalOpSenha.classList.add('escondido')
    operadorSelecionado = null
}

async function confirmarTrocaOperador() {
    if (!operadorSelecionado) return
    const senha = inputSenhaOperador.value
    if (!senha) { inputSenhaOperador.focus(); return }

    const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: operadorSelecionado.email, password: senha, role: 'auditor' })
    })

    if (!res.ok) {
        inputSenhaOperador.value = ''
        inputSenhaOperador.placeholder = 'Senha incorreta'
        setTimeout(() => { inputSenhaOperador.placeholder = 'Senha' }, 2000)
        inputSenhaOperador.focus()
        return
    }

    const data = await res.json()
    // Atualiza token local e variáveis em memória
    if (data.accessToken) localStorage.setItem('accessToken', data.accessToken)
    AUDITOR_ID = operadorSelecionado.id
    document.getElementById('nomeOperador').textContent = operadorSelecionado.name

    fecharModalOperador()
}

// Enter confirma senha
document.getElementById('inputSenhaOperador')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmarTrocaOperador()
})

// ─── Bandeja seleção de corredor ──────────────────────────────
const bandejaOverlay   = document.getElementById('bandejaOverlay')
const bandejaCorredores = document.getElementById('bandejaCorredores')

function abrirBandejaCorredores() {
    document.body.style.overflow = 'hidden'
    // Atualiza badge "atual" e destaque
    const items = bandejaCorredores.querySelectorAll('.bandeja-item')
    items.forEach(item => {
        const idx = Number(item.dataset.index)
        item.classList.toggle('selecionado', idx === atletaIndex)
        let badge = item.querySelector('.badge-atual')
        if (idx === atletaIndex) {
            if (!badge) {
                badge = document.createElement('span')
                badge.className = 'badge-atual'
                badge.textContent = 'atual'
                item.appendChild(badge)
            }
        } else {
            if (badge) badge.remove()
        }
    })

    bandejaOverlay.classList.remove('escondido')
    bandejaCorredores.classList.remove('escondido')
}

function fecharBandejaCorredores() {
    document.body.style.overflow = ''
    bandejaOverlay.classList.add('escondido')
    bandejaCorredores.classList.add('escondido')
}

function selecionarCorredorManual(el) {
    const novoIndex = Number(el.dataset.index)
    const novoId    = Number(el.dataset.id)

    atletaIndex = novoIndex
    atletaAtual = ATHLETES[novoIndex] || null

    if (atletaAtual) {
        corredorAtual.textContent = atletaAtual.name
        atualizarFila()
        btnAcao.disabled = false
        if (btnProximoCorredor) btnProximoCorredor.disabled = false
    } else {
        corredorAtual.textContent = '— Fim da fila —'
    }

    fecharBandejaCorredores()
}

// ─── Registros guardados de uma sessão anterior ───────────────
// A tela acabou de ser carregada do servidor, mas ainda há registros no tablet
// que ele não conhece. Envia tudo antes de liberar a operação e recarrega,
// para a tela refletir o estado real (turno aberto, histórico).
atualizarAvisoFila()
;(async () => {
    if (!filaTemPendencias()) return
    const estavaDesabilitado = btnAcao.disabled
    btnAcao.disabled = true
    for (let tentativa = 0; tentativa < 20 && filaTemPendencias(); tentativa++) {
        await processarFila()
        if (filaTemPendencias()) await new Promise(r => setTimeout(r, 3000))
    }
    if (!filaTemPendencias()) { recarregandoTela = true; window.location.reload(); return }
    btnAcao.disabled = estavaDesabilitado
})()
