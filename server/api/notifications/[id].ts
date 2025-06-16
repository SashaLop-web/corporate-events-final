import { defineEventHandler, getRouterParam, createError } from 'h3'
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
			throw createError({ statusCode: 401, statusMessage: 'Невалидный токен' })
		}

		const id = Number(getRouterParam(event, 'id'))
		if (isNaN(id)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Некорректный ID уведомления',
			})
		}

		const notification = await db('notifications')
			.leftJoin('events', 'notifications.event_id', 'events.id')
			.where('notifications.user_id', decoded.id)
			.andWhere('notifications.id', id)
			.select(
				'notifications.id',
				'notifications.message',
				'notifications.is_read',
				'notifications.response_status',
				'notifications.created_at',
				'notifications.type',
				'events.title as event_title',
				'events.type as event_type',
				'events.event_date',
				'events.location',
				'events.location_comment'
			)
			.first()

		if (!notification) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Уведомление не найдено',
			})
		}

		return {
			status: 'success',
			notification,
		}
	} catch (e: any) {
		console.error('Ошибка получения уведомления:', e.message)
		throw createError({
			statusCode: 500,
			statusMessage: e.message || 'Ошибка получения уведомления',
		})
	}
})
