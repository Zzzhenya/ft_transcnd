const axios = require('axios');

const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || 'http://log-service:3003';

class Logger {
	static async log(level, message, metadata = {}) {
		try {
			await axios.post(`${LOG_SERVICE_URL}/api/logs`, {
				level,
				message,
				service: process.env.SERVICE_NAME || 'unknown-service',
				metadata
			}, {
				timeout: 1000,
				validateStatus: () => true // No lanzar error en cualquier status
			});
		} catch (error) {
			// Fallback a console si log-service no está disponible
			console.error('Log service unavailable:', error.message);
			console.log(`[${level.toUpperCase()}]`, message, metadata);
		}
	}

	static info(message, metadata) {
		return this.log('info', message, metadata);
	}

	static error(message, metadata) {
		return this.log('error', message, metadata);
	}

	static warn(message, metadata) {
		return this.log('warn', message, metadata);
	}

	static debug(message, metadata) {
		return this.log('debug', message, metadata);
	}
}

module.exports = Logger;