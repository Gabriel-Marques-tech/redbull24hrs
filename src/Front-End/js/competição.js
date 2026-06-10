const competicoes = document.querySelectorAll(".competicao");

competicoes.forEach((competicao) => {

    competicao.addEventListener("click", () => {

        competicoes.forEach((item) => {
            item.classList.remove("selecionada");
        });

        competicao.classList.add("selecionada");

    });

});