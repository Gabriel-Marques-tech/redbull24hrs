// ---- authFetch ----
async function authFetch(url, options = {}) {
    const token = localStorage.getItem("accessToken");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    let res = await fetch(url, { ...options, headers, credentials: "include" });
    if (res.status === 401) {
        const r = await fetch("/auth/refresh", { method: "POST", credentials: "include" });
        if (!r.ok) { window.location.href = "/login"; return null; }
        const { accessToken } = await r.json();
        localStorage.setItem("accessToken", accessToken);
        headers["Authorization"] = `Bearer ${accessToken}`;
        res = await fetch(url, { ...options, headers, credentials: "include" });
    }
    return res;
}

// ---- validação CPF ----
function cpfValido(d) {
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    let s = 0;
    for (let i = 0; i < 9; i++) s += Number(d[i]) * (10 - i);
    let v1 = (s * 10) % 11; if (v1 === 10) v1 = 0;
    if (v1 !== Number(d[9])) return false;
    s = 0;
    for (let i = 0; i < 10; i++) s += Number(d[i]) * (11 - i);
    let v2 = (s * 10) % 11; if (v2 === 10) v2 = 0;
    return v2 === Number(d[10]);
}

const EVENTO  = window.EVENTO  || {};
const EQUIPES = window.EQUIPES || [];

// ---- navegação entre seções ----
function navegarSecao(secao) {
    const isGeral   = secao === 'geral';
    document.getElementById('secaoGeral').style.display   = isGeral   ? '' : 'none';
    document.getElementById('secaoEquipes').style.display = isGeral   ? 'none' : '';
    document.getElementById('navGeral').classList.toggle('ativa',    isGeral);
    document.getElementById('navEquipes').classList.toggle('ativa', !isGeral);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

const editNome  = document.getElementById("editNome");
const editLocal = document.getElementById("editLocal");
const editData  = document.getElementById("editData");
const editHora  = document.getElementById("editHora");
const listaEquipes = document.getElementById("listaEquipes");
const btnSalvar  = document.getElementById("btnSalvar");
const btnExcluir = document.getElementById("btnExcluir");

// ---- prefill dados gerais ----
editNome.value  = EVENTO.title || "";
editLocal.value = EVENTO.local || "";
if (EVENTO.date) {
    const iso = String(EVENTO.date);
    editData.value = iso.slice(0, 10);
    editHora.value = iso.slice(11, 16) || "";
}

const TOTAL_ATLETAS = 16;

// ---- navegar para form atleta ----
function abrirFormAtleta(teamId, atleta = null) {
    localStorage.setItem("atletaEmEdicao", JSON.stringify({
        modoEdicao: "event-edit",
        eventId:    EVENTO.id,
        teamId,
        atletaId:   atleta?.id   || null,
        atletaData: atleta ? { name: atleta.name, gender: atleta.gender, cpf: atleta.cpf || "" } : null
    }));
    window.location.href = "/manager/create-event/athlete";
}

// ---- atualizar estado botão adicionar ----
function atualizarBtnAdicionar(bloco) {
    const lista = bloco.querySelector(".lista-atletas-edit");
    const btn   = bloco.querySelector(".btn-add-atleta-edit");
    const qtd   = lista.querySelectorAll(".campo-atleta").length;
    const cheio = qtd >= TOTAL_ATLETAS;
    btn.disabled = cheio;
    btn.style.background = cheio ? "#9e9e9e" : "var(--vermelho)";
    btn.style.cursor     = cheio ? "default"  : "pointer";
    lista.querySelector(".contador-atletas-edit").textContent = `${qtd}/${TOTAL_ATLETAS}`;
}

// ---- slot com lápis + X ----
function criarSlotAtleta(atleta, bloco) {
    const teamId = Number(bloco.dataset.teamId);
    const lista  = bloco.querySelector(".lista-atletas-edit");
    const idx    = lista.querySelectorAll(".campo-atleta").length + 1;

    const div = document.createElement("div");
    div.className = "campo-atleta campo-atleta--edit";
    div.innerHTML = `
        <span>${idx}</span>
        <input type="text" readonly value="${atleta?.name || ""}" placeholder="Clique para preencher">
        <small>${atleta?.gender || ""}</small>
        <button type="button" class="btn-slot-editar" title="Editar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button type="button" class="btn-slot-remover" title="Remover"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    `;
    div.querySelector("input").addEventListener("click", () => abrirFormAtleta(teamId, atleta));
    div.querySelector(".btn-slot-editar").addEventListener("click", () => abrirFormAtleta(teamId, atleta));
    div.querySelector(".btn-slot-remover").addEventListener("click", async () => {
        if (!atleta?.id) { div.remove(); atualizarBtnAdicionar(bloco); return; }
        if (!confirm(`Remover ${atleta.name}?`)) return;
        const r = await authFetch(`/teams/${teamId}/athletes/${atleta.id}`, { method: "DELETE" });
        if (r && r.ok) { div.remove(); atualizarBtnAdicionar(bloco); }
        else alert("Erro ao remover atleta.");
    });
    return div;
}

function renderEquipes() {
    listaEquipes.innerHTML = "";
    EQUIPES.forEach((eq) => {
        const bloco = document.createElement("div");
        bloco.className = "equipe-edit";
        bloco.dataset.teamId = eq.id;
        bloco.innerHTML = `
            <label class="label-equipe">Nome da equipe
                <input class="eq-nome" type="text" value="${eq.name || ""}">
            </label>
            <div class="lista-atletas lista-atletas-edit">
                <span class="contador-atletas contador-atletas-edit"></span>
            </div>
            <button type="button" class="btn-add-atleta-edit btn-add-atleta">+ Adicionar atleta</button>
        `;
        const lista = bloco.querySelector(".lista-atletas-edit");
        (eq.atletas || []).forEach((a) => {
            lista.insertBefore(criarSlotAtleta(a, bloco), lista.querySelector(".contador-atletas-edit"));
        });
        atualizarBtnAdicionar(bloco);
        bloco.querySelector(".btn-add-atleta-edit").addEventListener("click", () => {
            if (lista.querySelectorAll(".campo-atleta").length < TOTAL_ATLETAS)
                abrirFormAtleta(eq.id, null);
        });
        listaEquipes.appendChild(bloco);
    });
}
renderEquipes();

// restaurar seção ao voltar do form atleta
if (new URLSearchParams(window.location.search).get("secao") === "equipes") {
    navegarSecao("equipes");
}

// ---- salvar (só evento + nomes equipes; atletas salvam direto no form) ----
async function salvar() {
    const nome  = editNome.value.trim();
    const local = editLocal.value.trim();
    if (!nome)  { alert("Dê um nome para a competição."); return; }
    if (!local) { alert("Informe o local."); return; }
    if (!editData.value) { alert("Informe a data."); return; }

    for (const bloco of listaEquipes.querySelectorAll(".equipe-edit")) {
        if (!bloco.querySelector(".eq-nome").value.trim()) {
            alert("Toda equipe precisa de um nome."); return;
        }
    }

    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";

    try {
        const date = `${editData.value}T${editHora.value || "00:00"}:00`;
        const evRes = await authFetch(`/events/${EVENTO.id}`, {
            method: "PATCH",
            body: JSON.stringify({ title: nome, local, date })
        });
        if (!evRes || !evRes.ok) throw new Error("Erro ao salvar dados da competição");

        for (const bloco of listaEquipes.querySelectorAll(".equipe-edit")) {
            const teamId    = Number(bloco.dataset.teamId);
            const nomeEquipe = bloco.querySelector(".eq-nome").value.trim();
            const eqRes = await authFetch(`/teams/${teamId}`, {
                method: "PATCH",
                body: JSON.stringify({ name: nomeEquipe })
            });
            if (!eqRes || !eqRes.ok) throw new Error(`Erro ao salvar equipe ${nomeEquipe}`);
        }

        window.location.href = "/home";
    } catch (e) {
        alert(e.message);
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar alterações";
    }
}

btnSalvar.addEventListener("click", salvar);

btnExcluir.addEventListener("click", async () => {
    if (!confirm("Excluir esta competição? Esta ação não pode ser desfeita.")) return;
    btnExcluir.disabled = true;
    const r = await authFetch(`/events/${EVENTO.id}`, { method: "DELETE" });
    if (r && r.ok) { window.location.href = "/home"; }
    else { alert("Erro ao excluir competição."); btnExcluir.disabled = false; }
});
