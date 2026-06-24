// ---- authFetch (necessário no modo event-edit) ----
async function authFetch(url, options = {}) {
    const token = localStorage.getItem("accessToken");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    let res = await fetch(url, { ...options, headers, credentials: "include" });
    if (res.status === 401) {
        const r = await fetch("/auth/refresh", { method: "POST", credentials: "include" });
        if (!r.ok) { window.location.href = "/login"; return null; }
        const { accessToken } = await r.json();
        localStorage.setItem("accessToken", accessToken);
        headers["Authorization"] = `Bearer ${accessToken}`;
        res = await fetch(url, { ...options, headers, credentials: "include" });
    }
    return res;
}

const edicao = JSON.parse(localStorage.getItem("atletaEmEdicao") || "null");
const formulario = document.getElementById("formAtleta");
const subetapaCadastro = document.getElementById("subetapaCadastro");
const tituloCadastroPessoa = document.getElementById("tituloCadastroPessoa");
const camposAtleta = document.getElementById("camposAtleta");
const camposAcesso = document.getElementById("camposAcesso");
const fotoPerfil = document.getElementById("fotoPerfilPessoa");
const fotoPerfilPreview = document.getElementById("fotoPerfilPreview");
const btnFotoPerfil = document.getElementById("btnFotoPerfil");
const nome       = document.getElementById("nomeAtleta");
const nascimento = document.getElementById("nascimentoAtleta");
const cpf        = document.getElementById("cpfAtleta");
const genero     = document.getElementById("generoAtleta");
const cargo      = document.getElementById("cargoAtleta");
const emailPessoa = document.getElementById("emailPessoa");
const senhaPessoa = document.getElementById("senhaPessoa");
const cpfApoio = document.getElementById("cpfApoio");
const linkCancelar = document.getElementById("linkCancelar");
let fotoPerfilData = "";

const modoEventEdit = edicao?.modoEdicao === "event-edit";
const modoDrawer = edicao?.origem === "drawer";
const passoRetorno = edicao?.passo ?? 0;

if (modoDrawer) {
    document.body.classList.add("cadastro-pelo-drawer");
}

const urlRetorno = modoEventEdit
    ? `/manager/event/${edicao.eventId}/edit?secao=equipes`
    : modoDrawer
        ? "/home"
    : `/manager/create-event/teams?passo=${passoRetorno}`;

const rotulosCadastro = {
    atleta: "atleta",
    auditor: "auditor",
    gerente: "gerente"
};

const tipoCadastroInicial = edicao?.tipoCadastro || "atleta";

function obterRotuloTipo(tipo) {
    return rotulosCadastro[tipo] || "atleta";
}

function atualizarPreviewFoto() {
    if (!fotoPerfilData) {
        fotoPerfilPreview.innerHTML = "<span>+</span>";
        return;
    }
    fotoPerfilPreview.innerHTML = `<img src="${fotoPerfilData}" alt="Foto de perfil">`;
}

function atualizarTipoCadastro() {
    const tipo = tipoCadastroInicial;
    const ehAtleta = tipo === "atleta";

    subetapaCadastro.textContent = `Cadastro de ${obterRotuloTipo(tipo)}`;
    tituloCadastroPessoa.textContent = `Informações do ${obterRotuloTipo(tipo)}`;

    camposAtleta.classList.toggle("escondido", !ehAtleta);
    camposAcesso.classList.toggle("ativo", !ehAtleta);
    formulario.classList.toggle("cadastro-apoio", !ehAtleta);
    document.body.classList.toggle("cadastro-apoio", !ehAtleta);

    nascimento.required = ehAtleta;
    genero.required = ehAtleta;
    cargo.required = ehAtleta;
    cpf.required = false;
    emailPessoa.required = ehAtleta;
    cpfApoio.required = !ehAtleta;
    senhaPessoa.required = !ehAtleta;

    if (!ehAtleta) {
        genero.value = "";
        cargo.value = "";
    } else if (edicao?.indice === 0 && !cargo.value) {
        cargo.value = "Líder";
    }
}

function compactarImagemPerfil(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onerror = reject;
        leitor.onload = () => {
            const imagem = new Image();
            imagem.onerror = reject;
            imagem.onload = () => {
                const tamanhoMaximo = 320;
                const escala = Math.min(1, tamanhoMaximo / Math.max(imagem.width, imagem.height));
                const largura = Math.max(1, Math.round(imagem.width * escala));
                const altura = Math.max(1, Math.round(imagem.height * escala));
                const canvas = document.createElement("canvas");
                canvas.width = largura;
                canvas.height = altura;
                const contexto = canvas.getContext("2d");
                contexto.fillStyle = "#ffffff";
                contexto.fillRect(0, 0, largura, altura);
                contexto.drawImage(imagem, 0, 0, largura, altura);
                resolve(canvas.toDataURL("image/jpeg", 0.78));
            };
            imagem.src = String(leitor.result || "");
        };
        leitor.readAsDataURL(arquivo);
    });
}

if (!edicao) {
    window.location.href = "/manager/create-event/teams";
} else {
    linkCancelar.href = urlRetorno;

    if (modoEventEdit) {
        // pré-preencher com dados do DB passados no contexto
        const d = edicao.atletaData;
        if (d) {
            nome.value  = d.name   || "";
            cpf.value   = formatarCpf(d.cpf || "");
            if (d.gender) genero.value = d.gender;
        }
        // cargo não existe no modelo athlete do DB, ocultar select se quiser
    } else {
        // pré-preencher dados já salvos em localStorage (fluxo criação)
        const estadoEquipes = JSON.parse(localStorage.getItem("cadastroEquipesGerente") || "{}");
        const cadastroSalvo = modoDrawer
            ? null
            : edicao.apoio
                ? estadoEquipes.cadastrosApoio?.[tipoCadastroInicial]?.[edicao.indice]
                : estadoEquipes.atletas?.[edicao.tipo]?.[edicao.indice];
        if (cadastroSalvo) {
            nome.value       = cadastroSalvo.nome       || "";
            nascimento.value = cadastroSalvo.nascimento || "";
            cpf.value        = formatarCpf(cadastroSalvo.cpf || "");
            cpfApoio.value   = formatarCpf(cadastroSalvo.cpf || "");
            emailPessoa.value = cadastroSalvo.email     || "";
            senhaPessoa.value = cadastroSalvo.senha     || "";
            fotoPerfilData    = cadastroSalvo.fotoPerfil || "";
            if (cadastroSalvo.genero) genero.value = cadastroSalvo.genero;
            if (cadastroSalvo.cargo)  cargo.value  = cadastroSalvo.cargo;
        }
        if (!edicao.apoio && !modoDrawer && edicao.indice === 0 && tipoCadastroInicial === "atleta") cargo.value = "Líder";
    }
    atualizarTipoCadastro();
    atualizarPreviewFoto();
}

btnFotoPerfil.addEventListener("click", () => fotoPerfil.click());

fotoPerfil.addEventListener("change", async () => {
    const arquivo = fotoPerfil.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
        alert("Escolha um arquivo de imagem.");
        fotoPerfil.value = "";
        return;
    }
    if (arquivo.size > 2 * 1024 * 1024) {
        alert("Escolha uma imagem de até 2 MB.");
        fotoPerfil.value = "";
        return;
    }

    try {
        fotoPerfilData = await compactarImagemPerfil(arquivo);
        atualizarPreviewFoto();
    } catch {
        alert("Não foi possível carregar a imagem. Tente outro arquivo.");
        fotoPerfil.value = "";
    }
});

// ---- validação de CPF (dígitos verificadores) ----
function cpfValido(digitos) {
    if (digitos.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digitos)) return false; // todos iguais
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(digitos[i]) * (10 - i);
    let d1 = (soma * 10) % 11; if (d1 === 10) d1 = 0;
    if (d1 !== Number(digitos[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(digitos[i]) * (11 - i);
    let d2 = (soma * 10) % 11; if (d2 === 10) d2 = 0;
    return d2 === Number(digitos[10]);
}

function formatarCpf(valor) {
    return valor
        .replace(/\D/g, "")
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

cpf.addEventListener("input", () => {
    cpf.value = formatarCpf(cpf.value);
});

cpfApoio.addEventListener("input", () => {
    cpfApoio.value = formatarCpf(cpfApoio.value);
});

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const tipoCadastroAtual = tipoCadastroInicial;
    const ehAtleta = tipoCadastroAtual === "atleta";

    if (!fotoPerfilData && !modoEventEdit) {
        alert("Envie uma imagem de perfil para este cadastro.");
        return;
    }

    const emailValor = emailPessoa.value.trim();

    if (ehAtleta && !emailValor) { alert("Preencha o e-mail."); return; }
    if (ehAtleta && !nascimento.value) { alert("Preencha a data de nascimento do atleta."); return; }
    if (ehAtleta && !genero.value) { alert("Selecione o gênero do atleta."); return; }
    if (ehAtleta && !cargo.value) { alert("Selecione o cargo do atleta."); return; }

    const cpfDigitos = (ehAtleta ? cpf.value : cpfApoio.value).replace(/\D/g, "");
    if (!ehAtleta && !cpfDigitos) { alert("Preencha o CPF."); return; }
    if (cpfDigitos && !cpfValido(cpfDigitos)) {
        alert("CPF inválido. Confira os números digitados."); return;
    }

    if (modoEventEdit) {
        // ---- salva direto na API ----
        const body = JSON.stringify({
            name:   nome.value.trim(),
            gender: genero.value,
            cpf:    cpfDigitos || null
        });
        const url = edicao.atletaId
            ? `/teams/${edicao.teamId}/athletes/${edicao.atletaId}`
            : `/teams/${edicao.teamId}/athletes`;
        const method = edicao.atletaId ? "PATCH" : "POST";

        const btn = formulario.querySelector("button[type=submit]");
        btn.disabled = true; btn.textContent = "Salvando...";

        const res = await authFetch(url, { method, body });
        if (!res || !res.ok) {
            const err = await res?.json().catch(() => ({}));
            alert(err?.error || "Erro ao salvar atleta.");
            btn.disabled = false; btn.textContent = "Concluir";
            return;
        }
        localStorage.removeItem("atletaEmEdicao");
        window.location.href = urlRetorno;

    } else {
        // ---- fluxo criação: salva em localStorage ----
        if (modoDrawer) {
            sessionStorage.setItem("cadastroUsuarioConcluido", JSON.stringify({
                tipoCadastro: tipoCadastroAtual,
                nome: nome.value.trim()
            }));
            localStorage.removeItem("atletaEmEdicao");
            window.location.href = urlRetorno;
            return;
        }

        const chaveEstado = "cadastroEquipesGerente";
        const estado = JSON.parse(localStorage.getItem(chaveEstado) || "{}");
        estado.atletas           ||= { primeira: [], segunda: [] };
        estado.cadastrosApoio    ||= { auditor: [], gerente: [] };
        if (!edicao.apoio) estado.atletas[edicao.tipo] ||= [];
        if (edicao.apoio) estado.cadastrosApoio[tipoCadastroAtual] ||= [];

        if (ehAtleta && cpfDigitos) {
            const duplicado = ["primeira", "segunda"].some((tipo) =>
                (estado.atletas[tipo] || []).some((a, i) =>
                    (!a?.tipoCadastro || a.tipoCadastro === "atleta") &&
                    a?.cpf === cpfDigitos &&
                    !(tipo === edicao.tipo && i === edicao.indice)
                )
            );
            if (duplicado) { alert("Este CPF já foi cadastrado em outro atleta."); return; }
        }

        const duplicadoCpfApoio = ["auditor", "gerente"].some((tipo) =>
            (estado.cadastrosApoio[tipo] || []).some((pessoa, i) =>
                pessoa?.cpf === cpfDigitos && !(tipo === tipoCadastroAtual && i === edicao.indice)
            )
        );
        const duplicadoEmailAtleta = ehAtleta && ["primeira", "segunda"].some((tipo) =>
            (estado.atletas[tipo] || []).some((atleta, i) =>
                atleta?.email === emailValor && !(tipo === edicao.tipo && i === edicao.indice)
            )
        );
        if (duplicadoCpfApoio || duplicadoEmailAtleta) {
            alert(duplicadoCpfApoio ? "Este CPF já foi cadastrado." : "Este e-mail já foi cadastrado.");
            return;
        }

        const cadastro = {
            tipoCadastro: tipoCadastroAtual,
            nome:       nome.value.trim(),
            fotoPerfil: fotoPerfilData
        };

        if (ehAtleta) {
            cadastro.nascimento = nascimento.value;
            cadastro.cpf        = cpfDigitos;
            cadastro.email      = emailValor;
            cadastro.genero     = genero.value;
            cadastro.cargo      = cargo.value || "Atleta";
        } else {
            cadastro.cpf = cpfDigitos;
            cadastro.senha = senhaPessoa.value;
            cadastro.cargo = tipoCadastroAtual === "auditor" ? "Auditor" : "Gerente";
        }

        if (edicao.apoio) {
            const indice = Number.isInteger(edicao.indice)
                ? edicao.indice
                : estado.cadastrosApoio[tipoCadastroAtual].length;
            estado.cadastrosApoio[tipoCadastroAtual][indice] = cadastro;
        } else {
            estado.atletas[edicao.tipo][edicao.indice] = cadastro;
        }

        localStorage.setItem(chaveEstado, JSON.stringify(estado));
        localStorage.removeItem("atletaEmEdicao");
        window.location.href = urlRetorno;
    }
});
