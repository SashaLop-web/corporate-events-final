import { defineEventHandler, readBody, createError } from 'h3'
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

		let decoded: JwtPayload
		try {
			decoded = jwt.verify(
				rawToken.split(' ')[1],
				process.env.JWT_SECRET || 'fallback-secret'
			) as JwtPayload
		} catch {
			throw createError({
				statusCode: 401,
				statusMessage: 'Невалидный токен',
			})
		}

		const body = await readBody(event)
		const { id, status } = body

		if (!id || !['accepted', 'declined'].includes(status)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Некорректные данные запроса',
			})
		}

		const updated = await db('notifications')
			.where('id', id)
			.andWhere('user_id', decoded.id)
			.update({
				response_status: status,
			})

		if (updated === 0) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Уведомление не найдено или недоступно для пользователя',
			})
		}

		return { status: 'success', message: 'Ответ сохранён' }
	} catch (e: any) {
		console.error('Ошибка при сохранении ответа:', e.message)
		throw createError({
			statusCode: 500,
			statusMessage: e.message || 'Ошибка при сохранении ответа',
		})
	}
})
