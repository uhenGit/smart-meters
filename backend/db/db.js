const pgp = require('pg-promise')();
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE,
};

// The commune db stores the date in DATE PG format, to decrease Storage size (4 bytes)
const db = pgp(dbConfig);

module.exports = db;
