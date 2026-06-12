const competicoes = document.querySelectorAll(".competicao");
const btnProximo = document.getElementById("btn-proximo");

competicoes.forEach((competicao) => {
    competicao.addEventListener("click", () => {
        competicoes.forEach((item) => item.classList.remove("selecionada"));
        competicao.classList.add("selecionada");

        const eventId = competicao.dataset.id;
        sessionStorage.setItem("eventId", eventId);
        btnProximo.disabled = false;
    });
});

function proximaEtapa() {
    const eventId = sessionStorage.getItem("eventId");
    if (!eventId) return;
    window.location.href = "/team?eventId=" + eventId;
}
