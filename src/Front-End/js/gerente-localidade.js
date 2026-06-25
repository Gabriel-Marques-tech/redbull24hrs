const inputNome     = document.getElementById("nomeCompeticao");
const inputEstado   = document.getElementById("estado");
const inputCidade   = document.getElementById("cidade");
const listaEstados  = document.getElementById("listaEstados");
const listaCidades  = document.getElementById("listaCidades");
const btnProximo    = document.querySelector(".btn-proximo-localidade");

const IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades";

// nome do estado -> sigla (UF)
const ufPorEstado = {};

// ---- combobox genérico ----
// dados: array de strings; onSelect(valor) callback opcional
function montarCombo(input, lista, getDados, onSelect) {
    const wrapper = input.closest(".campo-select");
    const seta    = wrapper.querySelector(".combo-seta");

    function render(filtro = "") {
        const termo = filtro.trim().toLowerCase();
        const dados = getDados().filter((v) => v.toLowerCase().includes(termo));
        lista.innerHTML = "";
        if (!dados.length) { fechar(); return; }
        dados.forEach((v) => {
            const li = document.createElement("li");
            li.textContent = v;
            li.addEventListener("mousedown", (e) => {
                e.preventDefault(); // evita blur antes do click
                input.value = v;
                fechar();
                if (onSelect) onSelect(v);
            });
            lista.appendChild(li);
        });
        wrapper.classList.add("aberto");
    }
    function fechar() { wrapper.classList.remove("aberto"); }

    input.addEventListener("focus", () => render(input.value));
    input.addEventListener("input", () => { render(input.value); if (onSelect) onSelect(input.value); });
    seta.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (input.disabled) return;
        if (wrapper.classList.contains("aberto")) { fechar(); }
        else { input.focus(); render(""); }
    });
    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) fechar();
    });

    return { render, fechar };
}

// ---- estados ----
let estadosNomes = [];
const comboEstado = montarCombo(inputEstado, listaEstados, () => estadosNomes, (valor) => {
    const uf = ufPorEstado[valor];
    if (uf) carregarCidades(uf);
});

// ---- cidades ----
let cidadesNomes = [];
montarCombo(inputCidade, listaCidades, () => cidadesNomes);

async function carregarEstados() {
    try {
        const res = await fetch(`${IBGE}/estados?orderBy=nome`);
        const estados = await res.json();
        estadosNomes = estados.map((e) => { ufPorEstado[e.nome] = e.sigla; return e.nome; });
    } catch (err) {
        console.error("Erro ao carregar estados do IBGE:", err);
    }
}

async function carregarCidades(uf) {
    inputCidade.value = "";
    cidadesNomes = [];
    inputCidade.disabled = true;
    inputCidade.placeholder = "Carregando cidades...";
    try {
        const res = await fetch(`${IBGE}/estados/${uf}/municipios`);
        const cidades = await res.json();
        cidadesNomes = cidades
            .map((c) => c.nome)
            .sort((a, b) => a.localeCompare(b, "pt-BR"));
        inputCidade.disabled = false;
        inputCidade.placeholder = "Digite ou selecione...";
    } catch (err) {
        console.error("Erro ao carregar cidades do IBGE:", err);
        inputCidade.placeholder = "Selecione um estado primeiro";
    }
}

btnProximo.addEventListener("click", () => {
    const nome   = inputNome.value.trim();
    const estado = inputEstado.value.trim();
    const cidade = inputCidade.value.trim();

    if (!nome) {
        alert("Dê um nome para a competição.");
        return;
    }
    if (!ufPorEstado[estado]) {
        alert("Selecione um estado válido da lista.");
        return;
    }
    if (!cidade) {
        alert("Selecione uma cidade.");
        return;
    }

    localStorage.setItem("localidadeCompeticao", JSON.stringify({
        nome,
        estado,
        cidade,
        uf: ufPorEstado[estado]
    }));
    window.location.href = "/manager/create-event/image";
});

// ---- restaurar seleção salva ----
async function init() {
    await carregarEstados();
    const salvo = JSON.parse(localStorage.getItem("localidadeCompeticao") || "null");
    if (salvo?.nome) inputNome.value = salvo.nome;
    if (salvo?.estado && ufPorEstado[salvo.estado]) {
        inputEstado.value = salvo.estado;
        await carregarCidades(ufPorEstado[salvo.estado]);
        if (salvo.cidade) inputCidade.value = salvo.cidade;
    }
}

init();
