const axios = require('axios');

const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || 'http://log-service:3003';
const LOGSTASH_URL = process.env.LOGSTASH_URL || 'http://logstash:5000';
const USE_LOGSTASH_DIRECT = process.env.USE_LOGSTASH_DIRECT === 'true';

class Logger {
	constructor(serviceName = 'unknown-service') {
		this.serviceName = serviceName;
	}

	async log(level, message, metadata = {}) {
		const logData = {
			level,
			message,
			service: this.serviceName,
			metadata,
			timestamp: new Date().toISOString()
		};

		// Si está configurado para usar Logstash directamente
		if (USE_LOGSTASH_DIRECT) {
			try {
				await axios.post(LOGSTASH_URL, logData, {
					timeout: 1000,
					validateStatus: () => true
				});
				return;
			} catch (error) {
				console.error('Logstash unavailable, falling back to log-service:', error.message);
			}
		}

		// Usar log-service (comportamiento por defecto)
		try {
			await axios.post(`${LOG_SERVICE_URL}/api/logs`, logData, {
				timeout: 1000,
				validateStatus: () => true // No lanzar error en cualquier status
			});
		} catch (error) {
			// Fallback a console si log-service no está disponible
			console.error('Log service unavailable:', error.message);
			console.log(`[${level.toUpperCase()}] [${this.serviceName}]`, message, metadata);
		}
	}

	info(message, metadata) {
		return this.log('info', message, metadata);
	}

	error(message, metadata) {
		return this.log('error', message, metadata);
	}

	warn(message, metadata) {
		return this.log('warn', message, metadata);
	}

	debug(message, metadata) {
		return this.log('debug', message, metadata);
	}
}

// Factory function to create logger instances
function createLogger(serviceName) {
	return new Logger(serviceName);
}

module.exports = createLogger;