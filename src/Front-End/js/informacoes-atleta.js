const edicao = JSON.parse(localStorage.getItem("atletaEmEdicao") || "null");
const formulario = document.getElementById("formAtleta");
const nome = document.getElementById("nomeAtleta");
const nascimento = document.getElementById("nascimentoAtleta");
const cpf = document.getElementById("cpfAtleta");
const genero = document.getElementById("generoAtleta");
const cargo = document.getElementById("cargoAtleta");
const cancelar = document.querySelector(".cancelar");

if (!edicao) {
    window.location.href = "equipe.html?passo=2";
} else {
    nome.value = edicao.nome;
    cancelar.href = `equipe.html?passo=${edicao.passo}`;

    if (edicao.indice === 0) {
        cargo.value = "Líder";
    }
}

formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const estado = JSON.parse(localStorage.getItem("cadastroEquipesGerente") || "{}");
    estado.atletas ||= { primeira: [], segunda: [] };
    estado.atletas[edicao.tipo] ||= [];
    estado.atletas[edicao.tipo][edicao.indice] = {
        nome: nome.value.trim(),
        nascimento: nascimento.value,
        cpf: cpf.value.trim(),
        genero: genero.value,
        cargo: cargo.value
    };

    localStorage.setItem("cadastroEquipesGerente", JSON.stringify(estado));
    localStorage.removeItem("atletaEmEdicao");
    window.location.href = `equipe.html?passo=${edicao.passo}`;
});

