// knexfile.js

/** @type {import('knex').Knex.Config} */
module.exports = {
	client: 'pg',
	connection: process.env.DATABASE_URL,
	migrations: {
		tableName: 'knex_migrations',
		directory: './migrations',
	},
	seeds: {
		directory: './seeds',
	},
}
