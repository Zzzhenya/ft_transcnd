const winston = require('winston');

// Configure log format
const logFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.errors({ stack: true }),
	winston.format.json()
);

// Create logger with console output only
// Logs are forwarded to Logstash via HTTP in index.js
const logger = winston.createLogger({
	level: 'info',
	format: logFormat,
	defaultMeta: {
		service: 'log-service',
		environment: process.env.NODE_ENV || 'development'
	},
	transports: [
		// Console transport for local debugging
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple()
			)
		})
	]
});

module.exports = logger;