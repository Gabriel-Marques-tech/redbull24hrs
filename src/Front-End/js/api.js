
async function apiFetch(url, options = {}) {
	const makeReq = (token) => {
		const headers = { 'Authorization': `Bearer ${token}`, ...options.headers }
		if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
		return fetch(url, { credentials: 'include', ...options, headers })
	}

	const accessToken = localStorage.getItem('accessToken')
	const res = await makeReq(accessToken)

	if (res.status === 401) {
		const refreshRes = await fetch('/auth/refresh', { method: 'POST', credentials: 'include' })
		if (!refreshRes.ok) { window.location.href = '/login'; return }
		const { accessToken: newToken } = await refreshRes.json()
		localStorage.setItem('accessToken', newToken)
		return makeReq(newToken)
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