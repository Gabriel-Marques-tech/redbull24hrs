const totalAtletas = 16;
const inputNomePrimeiraEquipe = document.getElementById("nomePrimeiraEquipe");
const inputNomeSegundaEquipe = document.getElementById("nomeSegundaEquipe");
const progressoEquipes = document.querySelector(".progresso-equipes");
const conteudoEquipes = document.querySelector(".conteudo-equipes-gerente");
const passosEquipes = document.querySelectorAll(".passo-equipe");
const btnAnteriorEquipes = document.getElementById("btnAnteriorEquipes");
const btnProximoEquipes = document.getElementById("btnProximoEquipes");
let passoAtual = Number(new URLSearchParams(window.location.search).get("passo")) || 1;
let campoAtivo = null;

function carregarEstado() {
    const salvo = JSON.parse(localStorage.getItem("cadastroEquipesGerente") || "{}");
    return {
        nomes: {
            primeira: salvo.nomes?.primeira || "Amigos do Pace",
            segunda: salvo.nomes?.segunda || "Inimigos do Pace"
        },
        atletas: {
            primeira: salvo.atletas?.primeira || [],
            segunda: salvo.atletas?.segunda || []
        }
    };
}

let estado = carregarEstado();

function salvarEstado() {
    estado.nomes.primeira = inputNomePrimeiraEquipe.value;
    estado.nomes.segunda = inputNomeSegundaEquipe.value;
    localStorage.setItem("cadastroEquipesGerente", JSON.stringify(estado));
}

function renderizarLista(tipo) {
    const lista = document.querySelector(`[data-lista-atletas="${tipo}"]`);
    const atletas = estado.atletas[tipo];
    const quantidadeCampos = Math.min(Math.max(atletas.length + 1, 1), totalAtletas);
    lista.innerHTML = "";

    for (let indice = 0; indice < quantidadeCampos; indice += 1) {
        const atleta = atletas[indice];
        const campo = document.createElement("div");
        campo.className = `campo-atleta${indice === 0 ? " lider" : ""}`;
        campo.innerHTML = `
            <span>${indice + 1}</span>
            <input type="text" value="${atleta?.nome || ""}" data-tipo="${tipo}" data-indice="${indice}">
            <small>Líder</small>
        `;
        lista.appendChild(campo);
    }

    const contador = document.createElement("strong");
    contador.className = "contador-atletas";
    contador.textContent = `${atletas.length}/${totalAtletas}`;
    lista.appendChild(contador);
}

function abrirCadastroAtleta(tipo, indice, nome) {
    if (!nome) return;
    localStorage.setItem("atletaEmEdicao", JSON.stringify({
        tipo,
        indice,
        nome,
        passo: tipo === "primeira" ? 2 : 4
    }));
    salvarEstado();
    window.location.href = "informacoes-atleta.html";
}

function adicionarAtleta(tipo) {
    const lista = document.querySelector(`[data-lista-atletas="${tipo}"]`);
    const selecionado = campoAtivo?.dataset.tipo === tipo ? campoAtivo : null;
    const campo = selecionado || [...lista.querySelectorAll("input")].find((input) => input.value.trim());

    if (!campo?.value.trim()) {
        lista.querySelector("input")?.focus();
        return;
    }

    abrirCadastroAtleta(tipo, Number(campo.dataset.indice), campo.value.trim());
}

function atualizarPasso() {
    passosEquipes.forEach((passo) => {
        passo.classList.toggle("ativo", Number(passo.dataset.passo) === passoAtual);
    });

    progressoEquipes.textContent = `${passoAtual}/4`;
    btnProximoEquipes.textContent = passoAtual === 4 ? "Concluir" : "Próximo";
    conteudoEquipes.classList.toggle("modo-atletas", passoAtual === 2 || passoAtual === 4);
    document.getElementById("tituloAtletasPrimeiraEquipe").textContent = `Adicione os atletas de ${inputNomePrimeiraEquipe.value}`;
    document.getElementById("tituloAtletasSegundaEquipe").textContent = `Adicione os atletas de ${inputNomeSegundaEquipe.value}`;
}

inputNomePrimeiraEquipe.value = estado.nomes.primeira;
inputNomeSegundaEquipe.value = estado.nomes.segunda;
renderizarLista("primeira");
renderizarLista("segunda");
atualizarPasso();

document.addEventListener("focusin", (evento) => {
    if (evento.target.matches(".campo-atleta input")) campoAtivo = evento.target;
});

document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Enter" || !evento.target.matches(".campo-atleta input")) return;
    evento.preventDefault();
    abrirCadastroAtleta(evento.target.dataset.tipo, Number(evento.target.dataset.indice), evento.target.value.trim());
});

document.querySelectorAll("[data-adicionar-atleta]").forEach((botao) => {
    botao.addEventListener("click", () => adicionarAtleta(botao.dataset.adicionarAtleta));
});

btnAnteriorEquipes.addEventListener("click", () => {
    if (passoAtual === 1) {
        window.location.href = "competition.ejs";
        return;
    }
    passoAtual -= 1;
    atualizarPasso();
});

btnProximoEquipes.addEventListener("click", () => {
    salvarEstado();
    if (passoAtual < 4) {
        passoAtual += 1;
        atualizarPasso();
    }
});

inputNomePrimeiraEquipe.addEventListener("input", atualizarPasso);
inputNomeSegundaEquipe.addEventListener("input", atualizarPasso);
