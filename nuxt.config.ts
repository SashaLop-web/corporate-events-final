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

	modules: ['@pinia/nuxt'],
	plugins: ['~/plugins/auth.ts'],

	server: {
		port: process.env.PORT || 3000,
		host: '0.0.0.0',
	},

	nitro: {
		preset: 'node-server',
		compatibilityDate: '2025-06-16',
	},
	devtools: {
		enabled: true,
	},

	typescript: {
		strict: true,
		shim: false,
	},
})
