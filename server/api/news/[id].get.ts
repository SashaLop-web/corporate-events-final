import { defineEventHandler, getRouterParam, createError } from 'h3'
import { db } from '~/server/database/db'

export default defineEventHandler(async event => {
	try {
		const rawId = getRouterParam(event, 'id')
		if (!rawId) {
			throw createError({
				statusCode: 400,
				statusMessage: 'ID новости не указан',
			})
		}

		const id = Number(rawId)
		if (isNaN(id)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'ID должен быть числом',
			})
		}

		const newsItem = await db('news')
			.leftJoin('events', 'news.event_id', 'events.id')
			.select(
				'news.id',
				'news.title',
				'news.content',
				'news.published_at',
				'news.image_url',
				'news.event_id',
				'events.title as event_title',
				'events.event_date',
				'events.type as event_type',
				'events.location as event_location',
				'events.location_comment as event_location_comment',
				'events.description as event_description',
				'events.organizer_id'
			)
			.where('news.id', id)
			.first()

		if (!newsItem) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Новость не найдена',
			})
		}

		return {
			status: 'success',
			data: newsItem,
		}
	} catch (error: any) {
		console.error('Ошибка получения новости:', error.message)
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Ошибка сервера',
		})
	}
})
