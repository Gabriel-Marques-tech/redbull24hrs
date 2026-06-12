const parametros = new URLSearchParams(window.location.search);
const abas = document.querySelectorAll("[data-aba]");
const paineis = document.querySelectorAll(".painel-estatisticas");

function ativarAba(nomeAba) {
    if (!abas.length) {
        return;
    }

    const abaEscolhida = [...abas].some((aba) => aba.dataset.aba === nomeAba) ? nomeAba : "geral";

    abas.forEach((aba) => {
        aba.classList.toggle("ativa", aba.dataset.aba === abaEscolhida);
    });

    paineis.forEach((painel) => {
        painel.classList.toggle("ativo", painel.id === `aba-${abaEscolhida}`);
    });
}

function formatarNome(nome) {
    return nome
        .replace(/Sansao/g, "Sansão")
        .replace(/Sao/g, "São");
}

abas.forEach((aba) => {
    aba.addEventListener("click", () => {
        ativarAba(aba.dataset.aba);
    });
});

ativarAba(parametros.get("aba") || "equipes");

document.querySelectorAll("[data-atleta]").forEach((linha) => {
    linha.addEventListener("click", () => {
        const nome = encodeURIComponent(linha.dataset.atleta || "Pietro Sansao");
        const time = encodeURIComponent(linha.dataset.time || "Inimigos do Pace");
        window.location.href = `estatisticas-atleta.html?nome=${nome}&time=${time}`;
    });
});

const nomeAtleta = document.getElementById("nomeAtleta");
const timeAtleta = document.getElementById("timeAtleta");

if (nomeAtleta) {
    nomeAtleta.textContent = formatarNome(parametros.get("nome") || "Pietro Sansão");
}

if (timeAtleta) {
    timeAtleta.textContent = parametros.get("time") || "Inimigos do Pace";
}


