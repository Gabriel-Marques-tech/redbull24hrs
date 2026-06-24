const inputImagemEvento = document.getElementById("imagemEvento");
const btnImagemEvento = document.getElementById("btnImagemEvento");
const imagemEventoPreview = document.getElementById("imagemEventoPreview");
const btnProximoImagem = document.querySelector(".btn-proximo-imagem");

let imagemEventoData = localStorage.getItem("imagemEvento") || "";

function atualizarPreview() {
    imagemEventoPreview.innerHTML = imagemEventoData
        ? `<img src="${imagemEventoData}" alt="Imagem do evento">`
        : "+";
}

function compactarImagem(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onerror = reject;
        leitor.onload = () => {
            const imagem = new Image();
            imagem.onerror = reject;
            imagem.onload = () => {
                const limite = 960;
                const escala = Math.min(1, limite / Math.max(imagem.width, imagem.height));
                const canvas = document.createElement("canvas");
                const contexto = canvas.getContext("2d");

                canvas.width = Math.max(1, Math.round(imagem.width * escala));
                canvas.height = Math.max(1, Math.round(imagem.height * escala));
                contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
            imagem.src = String(leitor.result || "");
        };
        leitor.readAsDataURL(arquivo);
    });
}

btnImagemEvento.addEventListener("click", () => inputImagemEvento.click());

inputImagemEvento.addEventListener("change", async () => {
    const arquivo = inputImagemEvento.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
        alert("Escolha um arquivo de imagem.");
        inputImagemEvento.value = "";
        return;
    }

    try {
        imagemEventoData = await compactarImagem(arquivo);
        atualizarPreview();
    } catch {
        alert("N\u00e3o foi poss\u00edvel carregar essa imagem. Tente outra.");
        inputImagemEvento.value = "";
    }
});

btnProximoImagem.addEventListener("click", () => {
    if (!imagemEventoData) {
        alert("Escolha uma imagem para o evento.");
        return;
    }

    localStorage.setItem("imagemEvento", imagemEventoData);
    window.location.href = "/manager/create-event/schedule";
});

atualizarPreview();
