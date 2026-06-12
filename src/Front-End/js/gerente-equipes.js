const inputNomePrimeiraEquipe = document.getElementById("nomePrimeiraEquipe");
const inputNomeSegundaEquipe = document.getElementById("nomeSegundaEquipe");
const tituloAtletasPrimeiraEquipe = document.getElementById("tituloAtletasPrimeiraEquipe");
const tituloAtletasSegundaEquipe = document.getElementById("tituloAtletasSegundaEquipe");
const progressoEquipes = document.querySelector(".progresso-equipes");
const conteudoEquipes = document.querySelector(".conteudo-equipes-gerente");
const passosEquipes = document.querySelectorAll(".passo-equipe");
const btnAnteriorEquipes = document.getElementById("btnAnteriorEquipes");
const btnProximoEquipes = document.getElementById("btnProximoEquipes");
const botoesAdicionarAtleta = document.querySelectorAll("[data-adicionar-atleta]");

const totalAtletas = 16;
let passoAtual = 1;

function obterListaAtletas(tipoEquipe) {
    return document.querySelector(`[data-lista-atletas="${tipoEquipe}"]`);
}

function obterCamposAtletas(tipoEquipe) {
    return [...obterListaAtletas(tipoEquipe).querySelectorAll(".campo-atleta input")];
}

function atualizarContadorAtletas(tipoEquipe) {
    const lista = obterListaAtletas(tipoEquipe);
    const contador = lista.querySelector(".contador-atletas");
    const quantidade = obterCamposAtletas(tipoEquipe).length;

    contador.textContent = `${quantidade}/${totalAtletas}`;
}

function adicionarCampoAtleta(tipoEquipe) {
    const lista = obterListaAtletas(tipoEquipe);
    const quantidadeAtual = obterCamposAtletas(tipoEquipe).length;

    if (quantidadeAtual >= totalAtletas) {
        return null;
    }

    const numeroAtleta = quantidadeAtual + 1;
    const campo = document.createElement("div");
    campo.className = "campo-atleta";
    campo.innerHTML = `
        <span>${numeroAtleta}</span>
        <input type="text" aria-label="Atleta ${numeroAtleta}">
        <small>Líder</small>
    `;

    lista.insertBefore(campo, lista.querySelector(".contador-atletas"));
    atualizarContadorAtletas(tipoEquipe);

    return campo.querySelector("input");
}

function avancarFluxoEquipes() {
    salvarEquipes();

    if (passoAtual === 4) {
        console.log("Cadastro de equipes concluído");
        return;
    }

    passoAtual += 1;
    atualizarPasso();
}

function configurarEntradaAtleta(evento) {
    if (!evento.target.matches(".campo-atleta input") || evento.key !== "Enter") {
        return;
    }

    evento.preventDefault();

    const lista = evento.target.closest("[data-lista-atletas]");
    const tipoEquipe = lista.dataset.listaAtletas;

    if (!evento.target.value.trim()) {
        return;
    }

    const campos = obterCamposAtletas(tipoEquipe);
    const ultimoCampo = campos[campos.length - 1];

    if (evento.target !== ultimoCampo) {
        campos[campos.indexOf(evento.target) + 1]?.focus();
        return;
    }

    if (campos.length === totalAtletas) {
        avancarFluxoEquipes();
        return;
    }

    adicionarCampoAtleta(tipoEquipe)?.focus();
}

function obterNomesAtletas(tipoEquipe) {
    return obterCamposAtletas(tipoEquipe)
        .map((campo) => campo.value.trim())
        .filter(Boolean);
}

function salvarEquipes() {
    const equipes = {
        primeiraEquipe: {
            nome: inputNomePrimeiraEquipe.value,
            atletas: obterNomesAtletas("primeira")
        },
        segundaEquipe: {
            nome: inputNomeSegundaEquipe.value,
            atletas: obterNomesAtletas("segunda")
        }
    };

    localStorage.setItem("equipesCompeticao", JSON.stringify(equipes));
    console.log("Equipes definidas:", equipes);
}

function atualizarTitulosAtletas() {
    tituloAtletasPrimeiraEquipe.textContent = `Adicione os atletas de ${inputNomePrimeiraEquipe.value}`;
    tituloAtletasSegundaEquipe.textContent = `Adicione os atletas de ${inputNomeSegundaEquipe.value}`;
}

function atualizarPasso() {
    passosEquipes.forEach((passo) => {
        passo.classList.toggle("ativo", Number(passo.dataset.passo) === passoAtual);
    });

    atualizarTitulosAtletas();
    progressoEquipes.textContent = `${passoAtual}/4`;
    btnProximoEquipes.textContent = passoAtual === 4 ? "Concluir" : "Próximo";
    conteudoEquipes.classList.toggle("modo-atletas", passoAtual === 2 || passoAtual === 4);

    if (passoAtual === 2) {
        obterCamposAtletas("primeira")[0].focus();
    }

    if (passoAtual === 4) {
        obterCamposAtletas("segunda")[0].focus();
    }
}

btnAnteriorEquipes.addEventListener("click", () => {
    if (passoAtual === 1) {
        window.location.href = "gerente-data-horario.html";
        return;
    }

    passoAtual -= 1;
    atualizarPasso();
});

btnProximoEquipes.addEventListener("click", avancarFluxoEquipes);

botoesAdicionarAtleta.forEach((botao) => {
    botao.addEventListener("click", () => {
        adicionarCampoAtleta(botao.dataset.adicionarAtleta)?.focus();
    });
});

inputNomePrimeiraEquipe.addEventListener("input", atualizarTitulosAtletas);
inputNomeSegundaEquipe.addEventListener("input", atualizarTitulosAtletas);
document.addEventListener("keydown", configurarEntradaAtleta);

atualizarContadorAtletas("primeira");
atualizarContadorAtletas("segunda");
atualizarPasso();
