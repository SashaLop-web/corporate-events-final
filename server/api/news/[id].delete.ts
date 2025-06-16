import { defineEventHandler, getRouterParam, createError } from 'h3'
import { db } from '~/server/database/db'
import jwt from 'jsonwebtoken'

interface JwtPayload {
	id: number
	role: string
}

export default defineEventHandler(async event => {
	try {
		const rawToken = event.headers.get('Authorization')
		if (!rawToken?.startsWith('Bearer ')) {
			throw createError({ statusCode: 401, statusMessage: 'Нет токена' })
		}

		let decoded: JwtPayload
		try {
			decoded = jwt.verify(
				rawToken.split(' ')[1],
				process.env.JWT_SECRET || 'secret'
			) as JwtPayload
		} catch {
			throw createError({
				statusCode: 401,
				statusMessage: 'Недопустимый токен',
			})
		}

		const id = Number(getRouterParam(event, 'id'))
		if (isNaN(id)) {
			throw createError({ statusCode: 400, statusMessage: 'Неверный ID' })
		}

		const existing = await db('news').where('id', id).first()
		if (!existing) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Новость не найдена',
			})
		}

		if (decoded.role !== 'admin' && existing.author_id !== decoded.id) {
			throw createError({
				statusCode: 403,
				statusMessage: 'Нет прав на удаление',
			})
		}

		await db('news').where('id', id).delete()

		return { status: 'success', message: 'Новость удалена' }
	} catch (e: any) {
		console.error('Ошибка удаления новости:', e.message)
		throw createError({
			statusCode: 500,
			statusMessage: e.message || 'Ошибка сервера',
		})
	}
})
