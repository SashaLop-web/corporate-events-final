import { defineEventHandler, createError } from 'h3'
import jwt from 'jsonwebtoken'
import { db } from '~/server/database/db'

interface JwtPayload {
	id: number
	email: string
	role: string
}

export default defineEventHandler(async event => {
	try {
		const rawToken = event.headers.get('Authorization')
		if (!rawToken?.startsWith('Bearer ')) {
			throw createError({
				statusCode: 401,
				statusMessage: 'Токен отсутствует или некорректный формат',
			})
		}

		const token = rawToken.split(' ')[1]

		let decoded: JwtPayload
		try {
			decoded = jwt.verify(
				token,
				process.env.JWT_SECRET || 'fallback-secret'
			) as JwtPayload
		} catch {
			throw createError({
				statusCode: 401,
				statusMessage: 'Недопустимый токен',
			})
		}

		const id = Number(event.context.params?.id)
		if (!id || isNaN(id)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Некорректный ID мероприятия',
			})
		}

		const eventData = await db('events').where({ id }).first()
		if (!eventData) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Мероприятие не найдено',
			})
		}

		const relatedUsers = await db('notifications')
			.where('event_id', id)
			.select('user_id')

		const deleted = await db('events').where({ id }).del()
		if (!deleted) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Мероприятие не найдено или уже удалено',
			})
		}

		if (Array.isArray(relatedUsers) && relatedUsers.length > 0) {
			const inserts = relatedUsers.map(({ user_id }) => ({
				user_id,
				event_id: id,
				message: `Мероприятие "${eventData.title}" было отменено.`,
				type: 'event_cancelled',
				is_read: false,
				created_at: new Date().toISOString(),
			}))
			await db('notifications').insert(inserts)
		}

		return {
			status: 'success',
			message: 'Мероприятие удалено и сотрудники уведомлены',
		}
	} catch (error: any) {
		console.error('Ошибка удаления:', error.message)
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Ошибка сервера',
		})
	}
})
