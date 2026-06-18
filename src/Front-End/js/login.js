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

document.getElementById("login-form")?.addEventListener("submit", submitLogin);
