const paginaKmMenorAviso = document.querySelector(".pagina-km-menor-aviso");
const btnCancelarKmMenorTeste = document.getElementById("btnCancelarKmMenorTeste");
const btnCorrigirKmMenorTeste = document.getElementById("btnCorrigirKmMenorTeste");

function fecharKmMenorTeste() {
    paginaKmMenorAviso.style.display = "none";
}

btnCancelarKmMenorTeste.addEventListener("click", fecharKmMenorTeste);
btnCorrigirKmMenorTeste.addEventListener("click", () => {
    fecharKmMenorTeste();
    console.log("Solicita correcao de quilometragem");
});

