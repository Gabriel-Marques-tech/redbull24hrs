document.getElementById("login-form").addEventListener("submit", submitLogin)

async function submitLogin(element) {
	element.preventDefault()

	//--------------- get infos of front end -----------------------------------------------
	const email = document.getElementById('email').value
	const password = document.getElementById('senha').value
	const role = document.querySelector('input[name="role"]:checked').value


	//--------------- fetch login endpoint -------------------------------------------------n
	const res = await fetch('/auth/login', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify( {email, password, role})
	})

	const data = await res.json()

	if (!res.ok) {
    	const erro = document.getElementById('erro')
    	erro.textContent = data.error
    	erro.style.display = 'block'
		console.log("erro")
    	return
  	}

  	localStorage.setItem('accessToken', data.accessToken)
	localStorage.setItem('user', JSON.stringify(data.user))
	window.location.href = '/home'
}