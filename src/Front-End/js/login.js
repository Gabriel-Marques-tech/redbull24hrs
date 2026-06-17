const titulo = document.querySelector(".titulo h1");
const formContainer = document.querySelector(".form");
const loginCard = document.querySelector(".login");

const loginFormHtml = `
	<form id="login-form">
		<div class="perfil-login" role="radiogroup" aria-label="Tipo de usuario">
			<label>
				<input type="radio" name="role" value="auditor" checked>
				Auditor
			</label>
			<label>
				<input type="radio" name="role" value="manager">
				Gerente
			</label>
		</div>

		<label for="email">E-mail</label>
		<input type="email" id="email" name="email" placeholder="Insira seu e-mail" autocomplete="email" required>
		<label for="senha" class="l1">Senha</label>
		<input type="password" name="senha" id="senha" placeholder="Insira sua senha" autocomplete="current-password" required>
		<p id="erro" style="color:red;display:none;margin:0;"></p>
		<button type="submit"><strong>Entrar</strong></button>
		<a class="link-cadastro" href="/login#cadastro">Cadastrar gerente</a>
	</form>
`;

const cadastroFormHtml = `
	<form id="signup-form">
		<label for="nome">Nome</label>
		<input type="text" id="nome" name="nome" placeholder="Insira seu nome" autocomplete="name" required>
		<label for="email">E-mail</label>
		<input type="email" id="email" name="email" placeholder="Insira seu e-mail" autocomplete="email" required>
		<label for="senha" class="l1">Senha</label>
		<input type="password" name="senha" id="senha" placeholder="Insira sua senha" autocomplete="new-password" required>
		<p id="erro" style="color:red;display:none;margin:0;"></p>
		<button type="submit"><strong>Concluir</strong></button>
		<a class="link-cadastro" href="/login">J&aacute; tenho login</a>
	</form>
`;

function renderLogin() {
	loginCard?.classList.remove("modo-cadastro");
	if (titulo) titulo.innerHTML = "Fa&ccedil;a seu login";
	if (formContainer) formContainer.innerHTML = loginFormHtml;
	document.getElementById("login-form")?.addEventListener("submit", submitLogin);
}

function renderCadastro() {
	loginCard?.classList.add("modo-cadastro");
	if (titulo) titulo.textContent = "Cadastre-se";
	if (formContainer) formContainer.innerHTML = cadastroFormHtml;
	document.getElementById("signup-form")?.addEventListener("submit", submitSignup);
}

function renderTelaAtual() {
	if (window.location.hash === "#cadastro") {
		renderCadastro();
		return;
	}

	renderLogin();
}

async function submitLogin(event) {
	event.preventDefault();

	const email = document.getElementById("email").value;
	const password = document.getElementById("senha").value;
	const role = document.querySelector('input[name="role"]:checked')?.value || "auditor";
	const erro = document.getElementById("erro");

	erro.style.display = "none";
	erro.textContent = "";

	const res = await fetch("/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password, role }),
	});

	const data = await res.json();

	if (!res.ok) {
		erro.textContent = data.error || "Erro ao entrar";
		erro.style.display = "block";
		return;
	}

	localStorage.setItem("accessToken", data.accessToken);
	localStorage.setItem("user", JSON.stringify(data.user));
	window.location.href = "/home";
}

function submitSignup(event) {
	event.preventDefault();

	const erro = document.getElementById("erro");

	erro.textContent = "Cadastro ainda nao esta conectado.";
	erro.style.display = "block";
}

window.addEventListener("hashchange", renderTelaAtual);
renderTelaAtual();
