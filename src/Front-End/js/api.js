
async function apiFetch(url, options = {}) {
	const accessToken = localStorage.getItem('accessToken')

	const res = await fetch(url, {
		credentials: 'include',
		...options,
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${accessToken}`,
			...options.headers
		}
	})

	if (res.status === 401) {
		const refreshRes = await fetch('/auth/refresh', {
			method: 'POST',
			credentials: 'include'
		})

		if (!refreshRes.ok) {
			window.location.href = '/login'
			return
		}

		const { accessToken: newToken } = await refreshRes.json()
		localStorage.setItem('accessToken', newToken)

		return await fetch(url, {
			credentials: 'include',
			...options,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${newToken}`,
				...options.headers
			}
		})
	}

	return res
}

//Descontinued (old CSR implementation) ---------------------------------------------------
async function requireAuth() {
	const token = localStorage.getItem('accessToken')
	console.log('teste')
	if (!token) {
		window.location.href = '/pages/index.html'
		
		return null
	}
	
	return JSON.parse(localStorage.getItem('user'))
}

export {apiFetch, requireAuth}