// Utilitários de imagem compartilhados pelo wizard de cadastro.
// Sem módulos: expõe funções globais para uso direto nos scripts das páginas.

// Lê um arquivo de imagem, redimensiona para no máximo `maxLado` px no maior lado
// e devolve um dataURL JPEG comprimido. Mantém o peso baixo para caber no localStorage.
function lerImagemRedimensionada(arquivo, maxLado = 512, qualidade = 0.7) {
	return new Promise((resolve, reject) => {
		if (!arquivo) {
			resolve(null);
			return;
		}
		const leitor = new FileReader();
		leitor.onerror = () => reject(new Error("Falha ao ler a imagem."));
		leitor.onload = () => {
			const img = new Image();
			img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
			img.onload = () => {
				let { width, height } = img;
				if (width > height && width > maxLado) {
					height = Math.round((height * maxLado) / width);
					width = maxLado;
				} else if (height >= width && height > maxLado) {
					width = Math.round((width * maxLado) / height);
					height = maxLado;
				}
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d");
				ctx.drawImage(img, 0, 0, width, height);
				resolve(canvas.toDataURL("image/jpeg", qualidade));
			};
			img.src = leitor.result;
		};
		leitor.readAsDataURL(arquivo);
	});
}

// Converte um dataURL em Blob, para anexar em FormData no envio multipart.
function dataURLparaBlob(dataURL) {
	if (!dataURL) return null;
	const [cabecalho, base64] = dataURL.split(",");
	const mime = (cabecalho.match(/:(.*?);/) || [])[1] || "image/jpeg";
	const binario = atob(base64);
	const bytes = new Uint8Array(binario.length);
	for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
	return new Blob([bytes], { type: mime });
}
