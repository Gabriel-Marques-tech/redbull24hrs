const parametros = new URLSearchParams(window.location.search);
const cidade = parametros.get("cidade") || "Rio de Janeiro";
const uf = parametros.get("uf") || "RJ";
const cidadeSelecionada = document.getElementById("cidadeSelecionada");
const locaisCompeticao = document.querySelectorAll(".local-competicao");

cidadeSelecionada.textContent = cidade;

locaisCompeticao.forEach((local) => {
    local.textContent = `${cidade}, ${uf}`;
});
