// ─── Auth fetch com refresh automático ───────────────────────
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('accessToken')
    const makeReq = (t) => fetch(url, {
        credentials: 'include',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${t}`,
            ...options.headers
        }
    })

    const res = await makeReq(token)
    if (res.status !== 401) return res

    // Token expirado — tenta refresh via cookie
    const refreshRes = await fetch('/auth/refresh', { method: 'POST', credentials: 'include' })
    if (!refreshRes.ok) { window.location.href = '/login'; return }

    const { accessToken: newToken } = await refreshRes.json()
    localStorage.setItem('accessToken', newToken)
    return makeReq(newToken)
}

// ─── Estado ───────────────────────────────────────────────────
let shiftId        = null
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
    cronometro.textContent = formatarTempo(segundos)
    document.body.classList.add('corrida-ativa')
    if (cronometroModal) cronometroModal.textContent = formatarTempo(segundos)
    timerInterval = setInterval(() => {
        segundos++
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

    const res = await authFetch('/audit/shifts/start', {
        method: 'POST',
        body: JSON.stringify({
            athlete_id:    atletaAtual.id,
            auditor_id:    AUDITOR_ID,
            operator_role: OPERATOR_ROLE,
            treadmill_id:  TREADMILL_ID,
            km_start:      kmStart
        })
    })

    btnAcao.disabled = false

    if (!res || !res.ok) {
        // Reverte UI
        pararTimer()
        segundos = 0
        cronometro.textContent = '00:00:00'
        emCorrida = false
        btnAcao.textContent = 'Iniciar corrida'
        if (btnProximoCorredor) btnProximoCorredor.classList.add('escondido')
        if (btnAbrirEsteiraEl)  btnAbrirEsteiraEl.classList.remove('inativa')
        inputKm.classList.remove('escondido')
        inputKm.value = kmStart

        if (!res) return  // refresh falhou → redirect /login

        const err = res ? await res.json() : {}

        if (res.status === 409 && err.conflict_shift_id) {
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

        alert('Erro ao iniciar: ' + err.error)
        return false
    }

    const shift = await res.json()
    shiftId = shift.id
    corridaInicioAt = shift.start_at
    checkpointsSessao = []
    agendarLembrete()

    // Persiste referência do turno ativo no localStorage para recuperação
    localStorage.setItem('activeShift', JSON.stringify({
        shiftId:     shift.id,
        treadmillId: TREADMILL_ID,
        teamId:      typeof TEAM_ID !== 'undefined' ? TEAM_ID : null,
        eventId:     typeof EVENT_ID !== 'undefined' ? EVENT_ID : null,
        startAt:     shift.start_at,
    }))
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
    const res = await authFetch(`/audit/shifts/${shiftId}/checkpoints`, {
        method: 'POST',
        body: JSON.stringify({ distance: kmDistance, type: 'voluntary' })
    })

    if (!res || !res.ok) {
        const err = await res.json()
        alert('Erro ao registrar checkpoint: ' + err.error)
        return
    }

    const cp = await res.json()
    const nomeOperadorAtual = document.getElementById('nomeOperador')?.textContent?.trim() || '—'
    checkpointsSessao.push({ id: cp.id, km: cp.distance, ts: new Date(cp.timestamp).getTime(), hora: new Date(cp.timestamp).toLocaleTimeString('pt-BR'), auditor: nomeOperadorAtual })
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
            if (!cp?.id) return
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
    const body = { km_end: kmEnd }
    // Troca de corredor: só envia se diferir do atleta atual do turno
    if (athleteIdOverride && (!atletaAtual || athleteIdOverride !== atletaAtual.id)) {
        body.athlete_id = athleteIdOverride
    }
    // Tempo editado: envia duração em segundos; backend faz end_at = start_at + duração no SQL
    if (durationSeconds != null) body.duration_seconds = durationSeconds
    if (pace) body.pace = pace

    const res = await authFetch(`/audit/shifts/${shiftId}/finish`, {
        method: 'PATCH',
        body: JSON.stringify(body)
    })

    if (!res || !res.ok) {
        const err = await res.json()
        alert('Erro ao finalizar: ' + err.error)
        return
    }

    const shift = await res.json()
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
        <span class="avatar"></span>
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
    if (!emCorrida || !shiftId) return
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
        if (emCorrida && shiftId) {
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

        if (!shiftId) return
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
            <div class="perfil-avatar"></div>
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
