import { defineEventHandler, createError } from 'h3'
import { db } from '~/server/database/db'

export default defineEventHandler(async () => {
	try {
		const news = await db('news')
			.select(
				'id',
				'title',
				'content',
				'event_id',
				'image_url',
				'author_id',
				'published_at'
			)
			.orderBy('published_at', 'desc')

		return {
			status: 'success',
			data: Array.isArray(news) ? news : [],
		}
	} catch (error: any) {
		console.error('Ошибка получения новостей:', error.message)
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Ошибка сервера при получении новостей',
		})
	}
})
