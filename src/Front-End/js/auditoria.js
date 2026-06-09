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