const parametrosCard = new URLSearchParams(window.location.search);

const camposCard = {
    nome: document.getElementById("cardNome"),
    equipe: document.getElementById("cardEquipe"),
    km: document.getElementById("cardKm"),
    pace: document.getElementById("cardPace"),
};

const botoesCard = {
    compartilhar: document.getElementById("btnCompartilharCard"),
    baixar: document.getElementById("btnBaixarCard"),
};

function valorComUnidade(valor, unidade, padrao) {
    if (!valor) return padrao;
    const texto = String(valor).trim();
    return texto.toLowerCase().includes(unidade.toLowerCase()) ? texto : `${texto}${unidade}`;
}

function dadosDoCard() {
    const dados = {
        nome: parametrosCard.get("nome") || "Participante",
        equipe: parametrosCard.get("equipe") || parametrosCard.get("time") || "RedBull 24 Horas",
        km: valorComUnidade(parametrosCard.get("km"), "km", "35km"),
        pace: parametrosCard.get("pace") || parametrosCard.get("ritmo") || "4:40/km",
    };

    camposCard.nome.textContent = dados.nome;
    camposCard.equipe.textContent = dados.equipe;
    camposCard.km.textContent = dados.km;
    camposCard.pace.textContent = dados.pace;

    return dados;
}

function carregarImagem(src) {
    return new Promise((resolve) => {
        const imagem = new Image();
        imagem.crossOrigin = "anonymous";
        imagem.onload = () => resolve(imagem);
        imagem.onerror = () => resolve(null);
        imagem.src = src;
    });
}

function quebrarTexto(ctx, texto, larguraMaxima) {
    const palavras = texto.split(" ");
    const linhas = [];
    let linha = "";

    palavras.forEach((palavra) => {
        const tentativa = linha ? `${linha} ${palavra}` : palavra;
        if (ctx.measureText(tentativa).width <= larguraMaxima) {
            linha = tentativa;
        } else {
            if (linha) linhas.push(linha);
            linha = palavra;
        }
    });

    if (linha) linhas.push(linha);
    return linhas;
}

function desenharRetanguloArredondado(ctx, x, y, largura, altura, raio) {
    if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, largura, altura, raio);
        return;
    }

    ctx.moveTo(x + raio, y);
    ctx.lineTo(x + largura - raio, y);
    ctx.quadraticCurveTo(x + largura, y, x + largura, y + raio);
    ctx.lineTo(x + largura, y + altura - raio);
    ctx.quadraticCurveTo(x + largura, y + altura, x + largura - raio, y + altura);
    ctx.lineTo(x + raio, y + altura);
    ctx.quadraticCurveTo(x, y + altura, x, y + altura - raio);
    ctx.lineTo(x, y + raio);
    ctx.quadraticCurveTo(x, y, x + raio, y);
}

function desenharLinhaEnergia(ctx, x, y, largura, cor, opacidade = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-28 * Math.PI / 180);
    const gradiente = ctx.createLinearGradient(0, 0, largura, 0);
    gradiente.addColorStop(0, "rgba(255, 207, 0, 0)");
    gradiente.addColorStop(0.5, cor);
    gradiente.addColorStop(1, "rgba(255, 207, 0, 0)");
    ctx.globalAlpha = opacidade;
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, largura, 14);
    ctx.restore();
}

function desenharTexturaDiagonal(ctx, largura, altura) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
    ctx.lineWidth = 2;
    ctx.rotate(-25 * Math.PI / 180);
    for (let x = -altura; x < largura + altura; x += 72) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, altura * 1.4);
        ctx.stroke();
    }
    ctx.restore();
}

function desenharArcoEnergia(ctx, x, y, raio, inicio, fim, opacidade = 1) {
    ctx.save();
    ctx.globalAlpha = opacidade;
    ctx.lineCap = "round";

    ctx.strokeStyle = "rgba(255, 207, 0, 0.72)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, raio, inicio, fim);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, raio - 34, fim + 0.35, inicio + Math.PI * 2 - 0.35);
    ctx.stroke();

    ctx.restore();
}

function desenharTextoCentral(ctx, texto, x, y, larguraMaxima, alturaLinha) {
    quebrarTexto(ctx, texto, larguraMaxima).slice(0, 2).forEach((linha, indice) => {
        ctx.fillText(linha, x, y + (indice * alturaLinha));
    });
}

async function gerarPngCard(dados) {
    const largura = 1080;
    const altura = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");

    const fundo = ctx.createLinearGradient(0, 0, largura, altura);
    fundo.addColorStop(0, "#ec0044");
    fundo.addColorStop(0.31, "#9b005b");
    fundo.addColorStop(0.63, "#250083");
    fundo.addColorStop(1, "#070064");
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, largura, altura);

    const brilho = ctx.createRadialGradient(largura / 2, 650, 40, largura / 2, 650, 520);
    brilho.addColorStop(0, "rgba(216, 0, 67, 0.38)");
    brilho.addColorStop(1, "rgba(216, 0, 67, 0)");
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, largura, altura);

    const vermelhoFundo = ctx.createRadialGradient(960, 1380, 30, 960, 1380, 360);
    vermelhoFundo.addColorStop(0, "rgba(223, 0, 64, 0.36)");
    vermelhoFundo.addColorStop(1, "rgba(223, 0, 64, 0)");
    ctx.fillStyle = vermelhoFundo;
    ctx.fillRect(0, 0, largura, altura);

    const amarelo = ctx.createRadialGradient(820, 240, 30, 820, 240, 340);
    amarelo.addColorStop(0, "rgba(255, 213, 0, 0.48)");
    amarelo.addColorStop(1, "rgba(255, 213, 0, 0)");
    ctx.fillStyle = amarelo;
    ctx.fillRect(0, 0, largura, altura);

    desenharTexturaDiagonal(ctx, largura, altura);
    desenharLinhaEnergia(ctx, 820, 185, 520, "rgba(255, 207, 0, 0.9)");
    desenharLinhaEnergia(ctx, -130, 420, 540, "rgba(255, 119, 0, 0.78)", 0.78);
    desenharLinhaEnergia(ctx, 820, 1585, 520, "rgba(91, 57, 255, 0.72)", 0.46);

    desenharArcoEnergia(ctx, 214, 248, 112, -0.1, Math.PI * 1.15, 0.9);
    desenharArcoEnergia(ctx, 1060, 1185, 250, Math.PI * 0.7, Math.PI * 1.95, 0.46);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 3;
    ctx.strokeRect(42, 42, largura - 84, altura - 84);

    const logoSrc = document.querySelector(".cartao-logo")?.src;
    const logo = await carregarImagem(logoSrc);
    if (logo) {
        const logoLargura = 400;
        const logoAltura = logo.height * (logoLargura / logo.width);
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 42;
        ctx.shadowOffsetY = 26;
        ctx.drawImage(logo, (largura - logoLargura) / 2, 145, logoLargura, logoAltura);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
    }

    const cardX = 78;
    const cardY = 630;
    const cardW = 924;
    const cardH = 1138;
    const vidro = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
    vidro.addColorStop(0, "rgba(255, 255, 255, 0.06)");
    vidro.addColorStop(1, "rgba(0, 0, 0, 0.08)");
    ctx.fillStyle = vidro;
    ctx.beginPath();
    desenharRetanguloArredondado(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    desenharRetanguloArredondado(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.stroke();

    const interrupcao = ctx.createLinearGradient(0, 0, largura, 0);
    interrupcao.addColorStop(0, "rgba(185, 24, 122, 0)");
    interrupcao.addColorStop(0.2, "#b9187a");
    interrupcao.addColorStop(0.8, "#a81275");
    interrupcao.addColorStop(1, "rgba(168, 18, 117, 0)");
    ctx.fillStyle = interrupcao;
    ctx.fillRect(304, cardY - 8, 472, 16);

    ctx.fillStyle = "#ffcf00";
    ctx.beginPath();
    desenharRetanguloArredondado(ctx, 310, cardY + 104, 460, 82, 41);
    ctx.fill();

    ctx.fillStyle = "#16004b";
    ctx.textAlign = "center";
    ctx.font = "900 34px Arial, Helvetica, sans-serif";
    ctx.fillText("DESAFIO CONCLUIDO", largura / 2, cardY + 157);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "800 62px Arial, Helvetica, sans-serif";
    ctx.fillText("Eu corri", largura / 2, cardY + 276);

    ctx.fillStyle = "#ffcf00";
    ctx.font = "900 158px Arial, Helvetica, sans-serif";
    ctx.shadowColor = "rgba(23, 0, 63, 0.32)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 12;
    ctx.fillText(dados.km, largura / 2, cardY + 410);
    ctx.shadowColor = "transparent";
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 62px Arial, Helvetica, sans-serif";
    ctx.fillText("na RedBull 24 Horas!", largura / 2, cardY + 514);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(300, cardY + 634);
    ctx.lineTo(780, cardY + 634);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
    ctx.font = "800 39px Arial, Helvetica, sans-serif";
    ctx.fillText("Pace m\u00e9dio", largura / 2, cardY + 704);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 86px Arial, Helvetica, sans-serif";
    ctx.fillText(dados.pace, largura / 2, cardY + 780);

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = "800 40px Arial, Helvetica, sans-serif";
    desenharTextoCentral(ctx, dados.nome, largura / 2, cardY + cardH - 155, 720, 42);

    ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
    ctx.font = "700 34px Arial, Helvetica, sans-serif";
    ctx.fillText(dados.equipe, largura / 2, cardY + cardH - 68);

    return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
}

function baixarArquivo(blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "redbull-24h-card.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function criarBlobCard() {
    return gerarPngCard(dadosDoCard());
}

async function compartilharCard() {
    const dados = dadosDoCard();
    const blob = await gerarPngCard(dados);
    if (!blob) return;

    const arquivo = new File([blob], "redbull-24h-card.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({
            files: [arquivo],
            title: "RedBull 24 Horas",
            text: `${dados.nome} correu ${dados.km} na RedBull 24 Horas!`,
        });
        return;
    }

    baixarArquivo(blob);
}

dadosDoCard();

botoesCard.compartilhar.addEventListener("click", async () => {
    botoesCard.compartilhar.disabled = true;
    botoesCard.compartilhar.textContent = "Gerando...";
    try {
        await compartilharCard();
    } catch (_) {
        alert("Nao foi possivel compartilhar agora. Tente baixar a imagem.");
    } finally {
        botoesCard.compartilhar.disabled = false;
        botoesCard.compartilhar.textContent = "Compartilhar";
    }
});

botoesCard.baixar.addEventListener("click", async () => {
    botoesCard.baixar.disabled = true;
    botoesCard.baixar.textContent = "Gerando...";
    try {
        const blob = await criarBlobCard();
        if (blob) baixarArquivo(blob);
    } finally {
        botoesCard.baixar.disabled = false;
        botoesCard.baixar.textContent = "Baixar PNG";
    }
});
