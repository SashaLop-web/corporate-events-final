import { defineEventHandler, readBody, createError } from 'h3'
import jwt from 'jsonwebtoken'
import { db } from '~/server/database/db'

interface JwtPayload {
	id: number
	email?: string
	role?: string
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
		const ids = Array.isArray(body.ids)
			? body.ids.map(Number).filter(Boolean)
			: []

		if (!ids.length) {
			throw createError({
				statusCode: 400,
				statusMessage:
					'Передайте массив ID уведомлений для пометки как прочитанные',
			})
		}

		await db('notifications')
			.whereIn('id', ids)
			.andWhere('user_id', decoded.id)
			.update({ is_read: true })

		return {
			status: 'success',
			message: `Обновлено уведомлений: ${ids.length}`,
		}
	} catch (error: any) {
		console.error('Ошибка пометки уведомлений:', error.message)
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Ошибка обработки запроса',
		})
	}
})
