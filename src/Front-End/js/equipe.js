const seleçãos = document.querySelectorAll(".seleção-equipe");

seleçãos.forEach((seleção) => {

    const botao = seleção.querySelector(".seleção-topo");

    botao.addEventListener("click", () => {

        const jaSelecionado = seleção.classList.contains("selecionado");
        const jaAberto = seleção.classList.contains("aberto");

        seleçãos.forEach((item) => {
            item.classList.remove("selecionado");
            item.classList.remove("aberto");
        });

        seleção.classList.add("selecionado");

        if(jaSelecionado && !jaAberto){
            seleção.classList.add("aberto");
        }

    });

});