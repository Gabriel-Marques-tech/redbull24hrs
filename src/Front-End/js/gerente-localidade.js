const cidadesPorEstado = {
    "Rio de Janeiro": ["Rio de Janeiro", "Niter\u00f3i", "Petr\u00f3polis"],
    "Sao Paulo": ["S\u00e3o Paulo", "Campinas", "Santos"],
    "Minas Gerais": ["Belo Horizonte", "Uberl\u00e2ndia", "Ouro Preto"],
    "Pernambuco": ["Recife", "Olinda", "Caruaru"],
    "Rio Grande do Sul": ["Porto Alegre", "Caxias do Sul", "Pelotas"]
};

const selectEstado = document.getElementById("estado");
const selectCidade = document.getElementById("cidade");
const btnProximo = document.querySelector(".btn-proximo-localidade");

function carregarCidades() {
    const cidades = cidadesPorEstado[selectEstado.value];

    selectCidade.innerHTML = "";

    cidades.forEach((cidade) => {
        const option = document.createElement("option");
        option.value = cidade;
        option.textContent = cidade;

        selectCidade.appendChild(option);
    });
}

selectEstado.addEventListener("change", carregarCidades);

btnProximo.addEventListener("click", () => {
    const localidade = {
        estado: selectEstado.value,
        cidade: selectCidade.value
    };

    localStorage.setItem("localidadeCompeticao", JSON.stringify(localidade));
    console.log("Localidade selecionada:", localidade);
});
