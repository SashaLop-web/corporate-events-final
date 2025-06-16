import { defineNuxtConfig } from 'nuxt/config'
import 'dotenv/config'

export default defineNuxtConfig({
	css: ['@/assets/styles/main.scss'],

	runtimeConfig: {
		jwtSecret: process.env.JWT_SECRET || 'default_fallback_key',
		public: {
			apiBase: process.env.API_BASE || '/api',
		},
	},

	nitro: {
		preset: 'node-server',
		port: parseInt(process.env.PORT || '3000'), // 👈 ВАЖНО!
		host: '0.0.0.0',
		compatibilityDate: '2025-06-16',
	},

	modules: ['@pinia/nuxt'],
	plugins: ['~/plugins/auth.ts'],

	devtools: {
		enabled: true,
	},

	typescript: {
		strict: true,
		shim: false,
	},
})
