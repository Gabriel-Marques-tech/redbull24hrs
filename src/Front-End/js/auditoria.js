const btnIniciar = document.getElementById("btnIniciar");
const btnProximoCorredor = document.getElementById("btnProximoCorredor");
const cronometro = document.getElementById("cronometro");
const btnAbrirEsteira = document.getElementById("btnAbrirEsteira");
const modalEsteira = document.getElementById("modalEsteira");
const btnCancelarEsteira = document.getElementById("btnCancelarEsteira");
const btnSelecionarEsteira = document.getElementById("btnSelecionarEsteira");
const numeroEsteira = document.getElementById("numeroEsteira");
const opcoesEsteira = document.querySelectorAll(".opcao-esteira");
const listaCorredores = document.getElementById("listaCorredores");
const corredoresFila = document.querySelectorAll(".corredor-fila");
const btnAbrirFinalizarCompeticao = document.querySelector(".btn-sair");
const modalFinalizarCompeticao = document.getElementById("modalFinalizarCompeticao");
const btnCancelarFinalizarCompeticao = document.getElementById("btnCancelarFinalizarCompeticao");
const btnConfirmarFinalizarCompeticao = document.getElementById("btnConfirmarFinalizarCompeticao");

let corridaIniciada = false;
let segundosCorrida = 0;
let esteiraSelecionada = numeroEsteira.textContent;
let itemArrastado = null;

function formatarTempo(totalSegundos) {
    const horas = String(Math.floor(totalSegundos / 3600)).padStart(2, "0");
    const minutos = String(Math.floor((totalSegundos % 3600) / 60)).padStart(2, "0");
    const segundos = String(totalSegundos % 60).padStart(2, "0");

    return `${horas}:${minutos}:${segundos}`;
}

function iniciarCronometro() {
    setInterval(() => {
        segundosCorrida += 1;
        cronometro.textContent = formatarTempo(segundosCorrida);
    }, 1000);
}

function atualizarSelecaoEsteira() {
    opcoesEsteira.forEach((opcao) => {
        opcao.classList.toggle("selecionada", opcao.dataset.esteira === esteiraSelecionada);
    });
}

function abrirModalEsteira() {
    if (corridaIniciada) {
        return;
    }

    esteiraSelecionada = numeroEsteira.textContent;
    atualizarSelecaoEsteira();
    modalEsteira.classList.remove("escondido");
}

function fecharModalEsteira() {
    modalEsteira.classList.add("escondido");
}

btnIniciar.addEventListener("click", () => {
    if (!corridaIniciada) {
        corridaIniciada = true;
        btnIniciar.textContent = "Registrar checkpoint";
        btnProximoCorredor.classList.remove("escondido");
        btnAbrirEsteira.classList.add("inativa");
        btnAbrirEsteira.setAttribute("aria-disabled", "true");
        document.title = "Competição Iniciada - Auditor";
        iniciarCronometro();
        return;
    }

    console.log("Checkpoint registrado em", cronometro.textContent);
});

btnProximoCorredor.addEventListener("click", () => {
    console.log("Próximo corredor selecionado");
});

btnAbrirEsteira.addEventListener("click", abrirModalEsteira);
btnCancelarEsteira.addEventListener("click", fecharModalEsteira);

btnSelecionarEsteira.addEventListener("click", () => {
    numeroEsteira.textContent = esteiraSelecionada;
    fecharModalEsteira();
});

opcoesEsteira.forEach((opcao) => {
    opcao.addEventListener("click", () => {
        esteiraSelecionada = opcao.dataset.esteira;
        atualizarSelecaoEsteira();
    });
});

modalEsteira.addEventListener("click", (evento) => {
    if (evento.target === modalEsteira) {
        fecharModalEsteira();
    }
});

function abrirModalFinalizarCompeticao() {
    modalFinalizarCompeticao.classList.remove("escondido");
}

function fecharModalFinalizarCompeticao() {
    modalFinalizarCompeticao.classList.add("escondido");
}

btnAbrirFinalizarCompeticao.addEventListener("click", abrirModalFinalizarCompeticao);
btnCancelarFinalizarCompeticao.addEventListener("click", fecharModalFinalizarCompeticao);

btnConfirmarFinalizarCompeticao.addEventListener("click", () => {
    fecharModalFinalizarCompeticao();
    console.log("Competição finalizada");
});

modalFinalizarCompeticao.addEventListener("click", (evento) => {
    if (evento.target === modalFinalizarCompeticao) {
        fecharModalFinalizarCompeticao();
    }
});

corredoresFila.forEach((corredor) => {
    corredor.addEventListener("dragstart", (evento) => {
        itemArrastado = corredor;
        corredor.classList.add("arrastando");

        evento.dataTransfer.effectAllowed = "move";
        evento.dataTransfer.setData("text/plain", corredor.innerText);
    });

    corredor.addEventListener("dragover", (evento) => {
        evento.preventDefault();
    });

    corredor.addEventListener("dragenter", () => {
        if (corredor !== itemArrastado) {
            corredor.classList.add("alvo");
        }
    });

    corredor.addEventListener("dragleave", () => {
        corredor.classList.remove("alvo");
    });

    corredor.addEventListener("drop", (evento) => {
        evento.preventDefault();
        corredor.classList.remove("alvo");

        if (itemArrastado !== null && itemArrastado !== corredor) {
            listaCorredores.insertBefore(itemArrastado, corredor);
        }
    });

    corredor.addEventListener("dragend", () => {
        corredor.classList.remove("arrastando");
        itemArrastado = null;

        corredoresFila.forEach((item) => {
            item.classList.remove("alvo");
        });
    });
});
