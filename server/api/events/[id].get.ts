import { defineEventHandler, getRouterParam, createError } from 'h3'
import { db } from '~/server/database/db'
import jwt from 'jsonwebtoken'

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
			throw createError({ statusCode: 401, statusMessage: 'Невалидный токен' })
		}

		const idParam = getRouterParam(event, 'id')
		if (!idParam) {
			throw createError({ statusCode: 400, statusMessage: 'ID не передан' })
		}
		const id = Number(idParam)
		if (isNaN(id)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Некорректный ID мероприятия',
			})
		}

		const eventData = await db('events').where('id', id).first()
		if (!eventData) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Мероприятие не найдено',
			})
		}

		// 🔒 Если нужно временно отключить проверку прав — закомментируй
		if (decoded.role !== 'admin' && eventData.organizer_id !== decoded.id) {
			throw createError({
				statusCode: 403,
				statusMessage: 'Недостаточно прав для просмотра',
			})
		}

		// Получение участников мероприятия
		const participants = await db('notifications')
			.join('users', 'notifications.user_id', 'users.id')
			.leftJoin('departments', 'users.department_id', 'departments.id')
			.where('notifications.event_id', id)
			.select(
				'users.id as user_id',
				'users.full_name',
				'users.email',
				'users.role',
				'departments.name as department',
				'notifications.response_status'
			)

		console.log(
			`🔍 Найдено участников: ${participants.length} для event_id = ${id}`
		)

		return {
			status: 'success',
			event: eventData,
			participants,
		}
	} catch (e: any) {
		console.error('Ошибка получения мероприятия:', e.message)
		throw createError({
			statusCode: 500,
			statusMessage: e.message || 'Ошибка при получении мероприятия',
		})
	}
})
