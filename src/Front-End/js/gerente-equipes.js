// authFetch: fetch com Bearer token + refresh automático
async function authFetch(url, options = {}) {
    const token = localStorage.getItem("accessToken");
    // FormData define seu próprio Content-Type (com boundary); não sobrescrever.
    const ehFormData = options.body instanceof FormData;
    const headers = { ...(ehFormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
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

// Monta o corpo da requisição: multipart (FormData) quando há foto, JSON quando não.
function montarCorpo(campos, fotoDataUrl) {
    if (!fotoDataUrl) return JSON.stringify(campos);
    const fd = new FormData();
    Object.entries(campos).forEach(([chave, valor]) => {
        if (valor !== null && valor !== undefined) fd.append(chave, valor);
    });
    fd.append("photo", dataURLparaBlob(fotoDataUrl), "foto.jpg");
    return fd;
}

const inputNomePrimeiraEquipe = document.getElementById("nomePrimeiraEquipe");
const inputNomeSegundaEquipe  = document.getElementById("nomeSegundaEquipe");
const tituloAtletasPrimeiraEquipe = document.getElementById("tituloAtletasPrimeiraEquipe");
const tituloAtletasSegundaEquipe  = document.getElementById("tituloAtletasSegundaEquipe");
const progressoEquipes  = document.querySelector(".progresso-equipes");
const conteudoEquipes   = document.querySelector(".conteudo-equipes-gerente");
const passosEquipes     = document.querySelectorAll(".passo-equipe");
const btnAnteriorEquipes = document.getElementById("btnAnteriorEquipes");
const btnProximoEquipes  = document.getElementById("btnProximoEquipes");
const botoesAdicionarAtleta = document.querySelectorAll("[data-adicionar-atleta]");

const totalAtletas = 16;
let passoAtual = (window.PASSO_INICIAL && window.PASSO_INICIAL > 1) ? window.PASSO_INICIAL : 1;

// ---- helpers de lista ----
function obterListaAtletas(tipo) {
    return document.querySelector(`[data-lista-atletas="${tipo}"]`);
}
function obterCamposAtletas(tipo) {
    return [...obterListaAtletas(tipo).querySelectorAll(".campo-atleta input")];
}
function atualizarContadorAtletas(tipo) {
    const lista    = obterListaAtletas(tipo);
    const contador = lista.querySelector(".contador-atletas");
    contador.textContent = `${obterCamposAtletas(tipo).length} atleta(s)`;
}

// ---- adicionar slot de atleta ----
function adicionarCampoAtleta(tipo) {
    const lista   = obterListaAtletas(tipo);
    const qtd     = obterCamposAtletas(tipo).length;

    const idx   = qtd; // 0-based
    const campo = document.createElement("div");
    campo.className = "campo-atleta";
    campo.innerHTML = `
        <span>${qtd + 1}</span>
        <input type="text" readonly placeholder="Clique para preencher"
               data-atleta-indice="${idx}" data-atleta-tipo="${tipo}"
               aria-label="Atleta ${qtd + 1} da equipe ${tipo}">
        <small></small>
    `;
    lista.querySelector(".lista-atletas-scroll").appendChild(campo);
    atualizarContadorAtletas(tipo);

    const input = campo.querySelector("input");
    input.addEventListener("click", () => abrirFormAtleta(tipo, idx));
    popularInputAtleta(input, tipo, idx);
    return input;
}

// ---- navegar para informacoes-atleta ----
function abrirFormAtleta(tipo, indice) {
    const passo = (tipo === "primeira") ? 2 : 4;
    localStorage.setItem("atletaEmEdicao", JSON.stringify({ tipo, indice, passo }));
    window.location.href = "/manager/create-event/athlete";
}

// ---- popular input com dados já salvos ----
function popularInputAtleta(input, tipo, indice) {
    const estado = JSON.parse(localStorage.getItem("cadastroEquipesGerente") || "{}");
    const atleta = estado.atletas?.[tipo]?.[indice];
    if (atleta?.nome) {
        input.value = atleta.nome;
        input.closest(".campo-atleta").querySelector("small").textContent = atleta.cargo || "";
    }
}

// ---- popular todos os inputs ao retornar ----
function popularTodosAtletas() {
    ["primeira", "segunda"].forEach((tipo) => {
        obterCamposAtletas(tipo).forEach((input, i) => {
            popularInputAtleta(input, tipo, i);
        });
    });
}

function restaurarCamposAtletas() {
    const estado = JSON.parse(localStorage.getItem("cadastroEquipesGerente") || "{}");

    ["primeira", "segunda"].forEach((tipo) => {
        const totalSalvo = estado.atletas?.[tipo]?.length || 0;
        while (obterCamposAtletas(tipo).length < totalSalvo) {
            adicionarCampoAtleta(tipo);
        }
    });
}

// ---- preencher nomes de equipe salvos ----
function restaurarNomesEquipes() {
    const estado = JSON.parse(localStorage.getItem("cadastroEquipesGerente") || "{}");
    if (estado.nomeEquipes?.primeira) inputNomePrimeiraEquipe.value = estado.nomeEquipes.primeira;
    if (estado.nomeEquipes?.segunda)  inputNomeSegundaEquipe.value  = estado.nomeEquipes.segunda;
}

// ---- salvar estado parcial ----
function salvarEstado() {
    const estado = JSON.parse(localStorage.getItem("cadastroEquipesGerente") || "{}");
    estado.nomeEquipes = {
        primeira: inputNomePrimeiraEquipe.value.trim(),
        segunda:  inputNomeSegundaEquipe.value.trim()
    };
    localStorage.setItem("cadastroEquipesGerente", JSON.stringify(estado));
}

// ---- títulos dinâmicos ----
function atualizarTitulosAtletas() {
    tituloAtletasPrimeiraEquipe.textContent =
        `Adicione os atletas de ${inputNomePrimeiraEquipe.value || "primeira equipe"}`;
    tituloAtletasSegundaEquipe.textContent =
        `Adicione os atletas de ${inputNomeSegundaEquipe.value || "segunda equipe"}`;
}

// ---- atualizar passo visual ----
function atualizarPasso() {
    passosEquipes.forEach((p) => {
        p.classList.toggle("ativo", Number(p.dataset.passo) === passoAtual);
    });
    atualizarTitulosAtletas();
    progressoEquipes.textContent = `${passoAtual}/4`;
    btnProximoEquipes.textContent = passoAtual === 4 ? "Concluir" : "Próximo";
    conteudoEquipes.classList.toggle("modo-atletas", passoAtual === 2 || passoAtual === 4);
    popularTodosAtletas();
}

// ---- avançar ----
async function avancarFluxoEquipes() {
    salvarEstado();
    if (passoAtual < 4) {
        passoAtual++;
        atualizarPasso();
        return;
    }
    // Passo 4 = Concluir: chamar API
    await submeterCadastro();
}

// ---- validar antes de enviar ----
function validarCadastro(estado) {
    const equipes = [
        { nome: estado.nomeEquipes?.primeira, chave: "primeira", rotulo: "primeira equipe" },
        { nome: estado.nomeEquipes?.segunda,  chave: "segunda",  rotulo: "segunda equipe" }
    ];
    for (const eq of equipes) {
        if (!eq.nome || !eq.nome.trim()) {
            return `Dê um nome para a ${eq.rotulo}.`;
        }
        const atletas = (estado.atletas?.[eq.chave] || []).filter((a) => a?.nome?.trim());
        if (atletas.length === 0) {
            return `Adicione ao menos um atleta na equipe "${eq.nome}".`;
        }
    }
    return null;
}

// ---- submeter para backend ----
async function submeterCadastro() {
    const estado = JSON.parse(localStorage.getItem("cadastroEquipesGerente") || "{}");

    const erroValidacao = validarCadastro(estado);
    if (erroValidacao) {
        alert(erroValidacao);
        return;
    }

    btnProximoEquipes.disabled = true;
    btnProximoEquipes.textContent = "Salvando...";

    try {
        const localidade  = JSON.parse(localStorage.getItem("localidadeCompeticao")  || "{}");
        const dataHorario = JSON.parse(localStorage.getItem("dataHorarioCompeticao") || "{}");

        const local = `${localidade.cidade || "?"}, ${localidade.estado || "?"}`;
        const date  = dataHorario.data
            ? `${dataHorario.data}T${dataHorario.horario || "00:00"}:00`
            : new Date().toISOString();

        // 1. Criar evento (multipart se houver foto, senão JSON)
        const eventoRes = await authFetch("/events", {
            method: "POST",
            body: montarCorpo({
                title: localidade.nome || "Red Bull 24h Corrida",
                local,
                date,
                manager_id: window.MANAGER_ID
            }, localidade.foto)
        });
        if (!eventoRes || !eventoRes.ok) {
            const err = await eventoRes?.json().catch(() => ({}));
            throw new Error(err?.error || "Erro ao criar evento");
        }
        const evento = await eventoRes.json();

        // 2. Criar equipes + atletas
        const equipes = [
            { chave: "primeira", nome: estado.nomeEquipes?.primeira || "Equipe 1" },
            { chave: "segunda",  nome: estado.nomeEquipes?.segunda  || "Equipe 2" }
        ];

        for (const eq of equipes) {
            const equipeRes = await authFetch("/teams", {
                method: "POST",
                body: JSON.stringify({ event_id: evento.id, name: eq.nome })
            });
            if (!equipeRes || !equipeRes.ok) {
                const err = await equipeRes?.json().catch(() => ({}));
                throw new Error(err?.error || `Erro ao criar equipe ${eq.nome}`);
            }
            const equipe = await equipeRes.json();

            const atletasEquipe = estado.atletas?.[eq.chave] || [];
            for (const atleta of atletasEquipe) {
                if (!atleta?.nome) continue;
                const atletaRes = await authFetch(`/teams/${equipe.id}/athletes`, {
                    method: "POST",
                    body: montarCorpo({
                        name:   atleta.nome,
                        gender: atleta.genero || "Outro",
                        cpf:    atleta.cpf    || null
                    }, atleta.foto)
                });
                if (!atletaRes || !atletaRes.ok) {
                    const err = await atletaRes?.json().catch(() => ({}));
                    throw new Error(`${atleta.nome}: ${err?.error || "erro ao cadastrar atleta"}`);
                }
            }
        }

        // Limpar localStorage do wizard
        ["localidadeCompeticao", "dataHorarioCompeticao", "cadastroEquipesGerente", "atletaEmEdicao"]
            .forEach((k) => localStorage.removeItem(k));

        window.location.href = "/home";

    } catch (e) {
        alert("Erro ao cadastrar competição: " + e.message);
        btnProximoEquipes.disabled = false;
        btnProximoEquipes.textContent = "Concluir";
    }
}

// ---- botões ----
btnAnteriorEquipes.addEventListener("click", () => {
    if (passoAtual === 1) {
        window.location.href = "/manager/create-event/schedule";
        return;
    }
    passoAtual--;
    atualizarPasso();
});

btnProximoEquipes.addEventListener("click", avancarFluxoEquipes);

botoesAdicionarAtleta.forEach((botao) => {
    botao.addEventListener("click", () => {
        const input = adicionarCampoAtleta(botao.dataset.adicionarAtleta);
        if (input) abrirFormAtleta(botao.dataset.adicionarAtleta, Number(input.dataset.atletaIndice));
    });
});

// ---- click em atleta já existente ----
document.addEventListener("click", (e) => {
    const input = e.target.closest(".campo-atleta input");
    if (!input) return;
    const tipo   = input.dataset.atletaTipo;
    const indice = Number(input.dataset.atletaIndice);
    if (tipo !== undefined) abrirFormAtleta(tipo, indice);
});

inputNomePrimeiraEquipe.addEventListener("input", atualizarTitulosAtletas);
inputNomeSegundaEquipe.addEventListener("input", atualizarTitulosAtletas);

// ---- inicialização ----
restaurarNomesEquipes();
restaurarCamposAtletas();
atualizarContadorAtletas("primeira");
atualizarContadorAtletas("segunda");
atualizarPasso();

// Adicionar data-atleta-* nos inputs do primeiro atleta (lider, já no HTML)
["primeira", "segunda"].forEach((tipo) => {
    const lista = obterListaAtletas(tipo);
    const lider = lista.querySelector(".campo-atleta.lider input");
    if (lider) {
        lider.dataset.atletaTipo   = tipo;
        lider.dataset.atletaIndice = "0";
        lider.addEventListener("click", () => abrirFormAtleta(tipo, 0));
        popularInputAtleta(lider, tipo, 0);
    }
});
