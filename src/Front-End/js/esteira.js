const esteiras = document.querySelectorAll(".esteira");

esteiras.forEach((esteira) => {

    const imagem = esteira.querySelector("img");

    esteira.addEventListener("mouseenter", () => {

        if(!esteira.classList.contains("selecionada")){
            imagem.src = "../assets/esteira/esteira-branca.svg";
        }

    });

    esteira.addEventListener("mouseleave", () => {

        if(!esteira.classList.contains("selecionada")){
            imagem.src = "../assets/esteira/esteira.svg";
        }

    });

    esteira.addEventListener("click", () => {

        esteiras.forEach((item) => {

            item.classList.remove("selecionada");

            const img = item.querySelector("img");
            img.src = "../assets/esteira/esteira.svg";

        });

        esteira.classList.add("selecionada");
        imagem.src = "../assets/esteira/esteira-branca.svg";

    });

});