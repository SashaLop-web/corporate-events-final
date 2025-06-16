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
			throw createError({ statusCode: 401, statusMessage: 'Токен отсутствует' })
		}

		let decoded: JwtPayload
		try {
			decoded = jwt.verify(
				rawToken.split(' ')[1],
				process.env.JWT_SECRET || 'fallback-secret'
			) as JwtPayload
		} catch {
			throw createError({ statusCode: 401, statusMessage: 'Невалидный токен' })
		}

		const notifications = await db('notifications')
			.leftJoin('events', 'notifications.event_id', 'events.id')
			.where('notifications.user_id', decoded.id)
			.orderBy('notifications.created_at', 'desc')
			.select(
				'notifications.id',
				'notifications.message',
				'notifications.type',
				'notifications.is_read',
				'notifications.created_at',
				'events.title as event_title',
				'events.event_date',
				'events.location',
				'events.location_comment',
				'events.type as event_type',
				'events.description as event_description'
			)

		return { status: 'success', notifications }
	} catch (error: any) {
		console.error('Ошибка получения уведомлений:', error.message)
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Ошибка получения уведомлений',
		})
	}
})
