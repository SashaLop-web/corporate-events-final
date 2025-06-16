import { defineEventHandler } from 'h3'
import jwt from 'jsonwebtoken'
import { db } from '~/server/database/db'
import { IncomingForm } from 'formidable'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const uploadDir = path.resolve('./public/uploads')

try {
	if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
} catch (err) {
	console.error('Ошибка создания папки uploads:', err)
}

interface JwtPayload {
	id: number
	email: string
	role: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default defineEventHandler(async event => {
	try {
		const rawToken = event.headers.get('Authorization')
		if (!rawToken?.startsWith('Bearer ')) {
			throw new Error('Токен не предоставлен или имеет неверный формат')
		}

		const token = rawToken.split(' ')[1]
		const decoded = jwt.verify(
			token,
			process.env.JWT_SECRET || 'fallback-secret'
		) as JwtPayload

		if (decoded.role !== 'admin') {
			throw new Error('У вас нет прав для создания новости')
		}

		const form = new IncomingForm({
			uploadDir,
			multiples: false,
			keepExtensions: true,
		})

		const [fields, files] = await new Promise<
			[Record<string, any>, Record<string, any>]
		>((resolve, reject) => {
			form.parse(event.req, (err, fields, files) => {
				if (err) reject(err)
				else resolve([fields, files])
			})
		})

		const title = Array.isArray(fields.title) ? fields.title[0] : fields.title
		const content = Array.isArray(fields.content)
			? fields.content[0]
			: fields.content
		const event_id = Array.isArray(fields.event_id)
			? fields.event_id[0]
			: fields.event_id

		if (!title || !content) {
			throw new Error('Недостаточно данных для создания новости')
		}

		let image_url: string | null = null

		if (files.image) {
			const file = Array.isArray(files.image) ? files.image[0] : files.image

			if (file.size > MAX_FILE_SIZE) {
				throw new Error('Размер файла превышает 5MB')
			}

			const mime = file.mimetype || file.type
			let extension = ''

			if (mime === 'image/jpeg') extension = '.jpg'
			else if (mime === 'image/png') extension = '.png'
			else throw new Error('Недопустимый тип изображения')

			const fileName = randomUUID() + extension
			const destPath = path.join(uploadDir, fileName)

			fs.renameSync(file.filepath || file.path, destPath)
			image_url = `/uploads/${fileName}`
		}

		const [inserted] = await db('news')
			.insert({
				title,
				content,
				event_id: event_id || null,
				image_url,
				author_id: decoded.id,
				published_at: new Date().toISOString(),
			})
			.returning('id')

		const newsId = inserted?.id || inserted

		return {
			status: 'success',
			message: 'Новость успешно опубликована',
			newsId,
		}
	} catch (error: any) {
		console.error('Ошибка публикации новости:', error.message)
		event.res.statusCode = error.message?.includes('Токен') ? 401 : 400
		return {
			status: 'error',
			message: error.message || 'Ошибка сервера',
		}
	}
})
