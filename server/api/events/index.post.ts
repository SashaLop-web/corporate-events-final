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
		// Авторизация
		const rawToken = event.headers.get('Authorization')
		if (!rawToken?.startsWith('Bearer ')) {
			throw createError({ statusCode: 401, statusMessage: 'Нет токена' })
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

		const body = await readBody(event)
		if (!body || typeof body !== 'object') {
			throw createError({
				statusCode: 400,
				statusMessage: 'Неверное тело запроса',
			})
		}

		const {
			title,
			event_date,
			type,
			description,
			location,
			location_comment,
			is_announced,
			participants,
			notifyAll,
			department_id,
		} = body

		if (!title || !event_date) {
			throw createError({ statusCode: 400, statusMessage: 'Не хватает данных' })
		}

		// Вставка мероприятия
		const insertData = {
			title,
			type: type || 'meeting',
			description: description || null,
			organizer_id: decoded.id,
			location: location || null,
			location_comment: location_comment || null,
			event_date,
			is_announced: is_announced || false,
		}

		await db('events').insert(insertData)

		// Получаем последний ID (только для SQLite)
		const [{ id: eventId }] = await db('events').orderBy('id', 'desc').limit(1)

		console.log('📌 Мероприятие создано, id =', eventId)

		const invitedUserIds = new Set<number>()

		// === Индивидуальные встречи ===
		if (type === 'meeting_individual') {
			const validParticipants = Array.isArray(participants)
				? participants.map(Number).filter(id => Number.isInteger(id))
				: []

			if (validParticipants.length === 0) {
				throw createError({
					statusCode: 400,
					statusMessage: 'Нужно указать участников для индивидуальной встречи',
				})
			}

			for (const userId of validParticipants) {
				invitedUserIds.add(userId)
				await db('invitations').insert({
					event_id: eventId,
					user_id: userId,
					status: 'pending',
					comment: null,
				})
				await db('notifications').insert({
					user_id: userId,
					event_id: eventId,
					message: `Вас пригласили на мероприятие: "${title}"`,
					type: 'event_invite',
					is_read: false,
					scheduled_time: null,
					created_at: new Date().toISOString(),
				})
			}
		}

		// === Встреча по отделу ===
		if (type === 'meeting_department') {
			if (!department_id) {
				throw createError({
					statusCode: 400,
					statusMessage: 'Не выбран отдел',
				})
			}

			const deptUsers = await db('users').select('id').where({ department_id })

			for (const { id } of deptUsers) {
				invitedUserIds.add(id)
				await db('invitations').insert({
					event_id: eventId,
					user_id: id,
					status: 'pending',
					comment: null,
				})
				await db('notifications').insert({
					user_id: id,
					event_id: eventId,
					message: `Вы приглашены на встречу отдела: "${title}"`,
					type: 'event_invite',
					is_read: false,
					scheduled_time: null,
					created_at: new Date().toISOString(),
				})
			}
		}

		// === Рассылка всем сотрудникам ===
		if (
			notifyAll &&
			!['meeting_individual', 'meeting_department'].includes(type)
		) {
			const employees = await db('users')
				.select('id')
				.where({ role: 'employee' })

			for (const { id } of employees) {
				if (!invitedUserIds.has(id)) {
					await db('notifications').insert({
						user_id: id,
						event_id: eventId,
						message: `Новое корпоративное мероприятие: "${title}"`,
						type: 'event_announce',
						is_read: false,
						scheduled_time: null,
						created_at: new Date().toISOString(),
					})
				}
			}
		}

		console.log('✅ Уведомления успешно добавлены')

		return {
			status: 'success',
			message: 'Мероприятие успешно создано',
			eventId,
		}
	} catch (error: any) {
		console.error('❌ Ошибка создания мероприятия:', error)
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Ошибка сервера',
		})
	}
})
