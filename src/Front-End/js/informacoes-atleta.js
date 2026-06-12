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
const nome       = document.getElementById("nomeAtleta");
const nascimento = document.getElementById("nascimentoAtleta");
const cpf        = document.getElementById("cpfAtleta");
const genero     = document.getElementById("generoAtleta");
const cargo      = document.getElementById("cargoAtleta");
const linkCancelar = document.getElementById("linkCancelar");

const modoEventEdit = edicao?.modoEdicao === "event-edit";
const urlRetorno = modoEventEdit
    ? `/manager/event/${edicao.eventId}/edit?secao=equipes`
    : `/manager/create-event/teams?passo=${edicao?.passo || 1}`;

if (!edicao) {
    window.location.href = "/manager/create-event/teams";
} else {
    linkCancelar.href = urlRetorno;

    if (modoEventEdit) {
        // pré-preencher com dados do DB passados no contexto
        const d = edicao.atletaData;
        if (d) {
            nome.value  = d.name   || "";
            cpf.value   = d.cpf    || "";
            if (d.gender) genero.value = d.gender;
        }
        // cargo não existe no modelo athlete do DB, ocultar select se quiser
    } else {
        // pré-preencher dados já salvos em localStorage (fluxo criação)
        const estado = JSON.parse(localStorage.getItem("cadastroEquipesGerente") || "{}");
        const atletaSalvo = estado.atletas?.[edicao.tipo]?.[edicao.indice];
        if (atletaSalvo) {
            nome.value       = atletaSalvo.nome       || "";
            nascimento.value = atletaSalvo.nascimento || "";
            cpf.value        = atletaSalvo.cpf        || "";
            if (atletaSalvo.genero) genero.value = atletaSalvo.genero;
            if (atletaSalvo.cargo)  cargo.value  = atletaSalvo.cargo;
        }
        if (edicao.indice === 0) cargo.value = "Líder";
    }
}

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

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!genero.value) { alert("Selecione o gênero do atleta."); return; }

    const cpfDigitos = cpf.value.replace(/\D/g, "");
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
        const estado = JSON.parse(localStorage.getItem("cadastroEquipesGerente") || "{}");
        estado.atletas           ||= { primeira: [], segunda: [] };
        estado.atletas[edicao.tipo] ||= [];

        if (cpfDigitos) {
            const duplicado = ["primeira", "segunda"].some((tipo) =>
                (estado.atletas[tipo] || []).some((a, i) =>
                    a?.cpf === cpfDigitos && !(tipo === edicao.tipo && i === edicao.indice)
                )
            );
            if (duplicado) { alert("Este CPF já foi cadastrado em outro atleta."); return; }
        }

        estado.atletas[edicao.tipo][edicao.indice] = {
            nome:       nome.value.trim(),
            nascimento: nascimento.value,
            cpf:        cpfDigitos,
            genero:     genero.value,
            cargo:      cargo.value
        };

        localStorage.setItem("cadastroEquipesGerente", JSON.stringify(estado));
        localStorage.removeItem("atletaEmEdicao");
        window.location.href = urlRetorno;
    }
});
