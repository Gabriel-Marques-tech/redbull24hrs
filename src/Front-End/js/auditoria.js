let itemArrastado = null;

const lista = document.getElementById("listaCorredores");

document.querySelectorAll(".corredor-fila").forEach((corredor) => {
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
            lista.insertBefore(itemArrastado, corredor);
        }
    });

    corredor.addEventListener("dragend", () => {
        corredor.classList.remove("arrastando");
        itemArrastado = null;

        document.querySelectorAll(".corredor-fila").forEach((item) => {
            item.classList.remove("alvo");
        });
    });
});

const btnAbrirEsteira = document.getElementById("btnAbrirEsteira");
const modalEsteira = document.getElementById("modalEsteira");
const btnCancelarEsteira = document.getElementById("btnCancelarEsteira");
const btnSelecionarEsteira = document.getElementById("btnSelecionarEsteira");
const numeroEsteira = document.getElementById("numeroEsteira");
const opcoesEsteira = document.querySelectorAll(".opcao-esteira");

let esteiraSelecionada = numeroEsteira.textContent;

function abrirModalEsteira() {
    esteiraSelecionada = numeroEsteira.textContent;
    atualizarSelecaoEsteira();
    modalEsteira.classList.remove("escondido");
}

function fecharModalEsteira() {
    modalEsteira.classList.add("escondido");
}

function atualizarSelecaoEsteira() {
    opcoesEsteira.forEach((opcao) => {
        opcao.classList.toggle("selecionada", opcao.dataset.esteira === esteiraSelecionada);
    });
}

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
