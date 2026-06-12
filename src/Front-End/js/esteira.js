const esteiras = document.querySelectorAll(".esteira");
const btnProximo = document.getElementById("btn-proximo");

function imgPadrao(esteira) {
    return esteira.classList.contains("esteira-ocupada")
        ? "/assets/esteira/esteira-cinza.svg"
        : "/assets/esteira/esteira.svg";
}

esteiras.forEach((esteira) => {
    if (esteira.classList.contains("esteira-ocupada")) return;

    const imagem = esteira.querySelector("img");

    esteira.addEventListener("mouseenter", () => {
        if (!esteira.classList.contains("selecionada")) {
            imagem.src = "/assets/esteira/esteira-branca.svg";
        }
    });

    esteira.addEventListener("mouseleave", () => {
        if (!esteira.classList.contains("selecionada")) {
            imagem.src = "/assets/esteira/esteira.svg";
        }
    });

    esteira.addEventListener("click", () => {
        esteiras.forEach((item) => {
            item.classList.remove("selecionada");
            item.querySelector("img").src = imgPadrao(item);
        });

        esteira.classList.add("selecionada");
        imagem.src = "/assets/esteira/esteira-branca.svg";

        sessionStorage.setItem("treadmillId", esteira.dataset.id);
        btnProximo.disabled = false;
    });
});

function proximaEtapa() {
    const eventId = sessionStorage.getItem("eventId");
    const teamId = sessionStorage.getItem("teamId");
    const treadmillId = sessionStorage.getItem("treadmillId");
    if (!treadmillId) return;
    window.location.href = `/overview?eventId=${eventId}&teamId=${teamId}&treadmillId=${treadmillId}`;
}
