import { defineNuxtPlugin } from '#app'
import { useUserStore } from '~/stores/user'

interface VerifyTokenResponse {
	status: string
	user: {
		id: number
		email: string
		full_name: string
		role: string
	}
}

interface RefreshTokenResponse {
	token: string
}

export default defineNuxtPlugin(async () => {
	if (!process.client) return

	const userStore = useUserStore()
	const token = localStorage.getItem('authToken')
	const refreshToken = localStorage.getItem('refreshToken')

	const verifyUser = async (tokenToVerify: string): Promise<boolean> => {
		try {
			const res = await $fetch<VerifyTokenResponse>('/api/auth/verify-token', {
				method: 'POST',
				body: { token: tokenToVerify },
				headers: {
					'Content-Type': 'application/json',
				},
			})

			if (res && res.user) {
				userStore.setUser(res.user)
				return true
			}
		} catch (err) {
			console.warn('Ошибка при проверке токена:', err)
		}
		return false
	}

	const tryRefresh = async (): Promise<boolean> => {
		try {
			const res = await $fetch<RefreshTokenResponse>(
				'/api/auth/refresh-token',
				{
					method: 'POST',
					body: { refreshToken },
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			if (res && res.token) {
				localStorage.setItem('authToken', res.token)
				return await verifyUser(res.token)
			}
		} catch (err) {
			console.warn('Ошибка при обновлении токена:', err)
		}
		return false
	}

	if (token) {
		const success = await verifyUser(token)
		if (!success && refreshToken) {
			const refreshed = await tryRefresh()
			if (!refreshed) {
				userStore.clearUser()
				localStorage.removeItem('authToken')
				localStorage.removeItem('refreshToken')
			}
		}
	}
})
