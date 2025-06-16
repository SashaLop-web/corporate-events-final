import { defineEventHandler, createError } from 'h3'
import { db } from '~/server/database/db'

export default defineEventHandler(async () => {
	try {
		const departments = await db('departments').select('id', 'name')
		return { success: true, departments }
	} catch (error: any) {
		console.error('Ошибка при получении отделов:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Ошибка при получении отделов',
		})
	}
})
