import { db } from '~/server/database/db'
import { defineEventHandler, readBody, createError } from 'h3'

interface SupportRequestBody {
	name: string
	email: string
	topic: string
	message: string
}

export default defineEventHandler(async event => {
	try {
		const body = await readBody<SupportRequestBody>(event)

		// Логируем полученные данные для отладки
		console.log('📨 Пришёл запрос в поддержку:', body)

		// Проверка обязательных полей
		if (!body.name || !body.email || !body.message || !body.topic) {
			console.warn('⚠️ Не все поля заполнены')
			throw createError({
				statusCode: 400,
				statusMessage: 'Все поля обязательны',
			})
		}

		// Вставка в таблицу support_requests
		const inserted = await db('support_requests')
			.insert({
				name: body.name,
				email: body.email,
				topic: body.topic,
				message: body.message,
				created_at: new Date().toISOString(),
			})
			.returning('id') // для PostgreSQL

		console.log('✅ Запрос успешно сохранён, ID:', inserted)

		return {
			success: true,
			message: 'Запрос сохранён в базе',
			id: inserted[0]?.id || inserted[0], // в зависимости от версии pg/knex
		}
	} catch (error: any) {
		console.error('❌ Ошибка сохранения в БД:', error.message)
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Ошибка при сохранении запроса',
		})
	}
})
