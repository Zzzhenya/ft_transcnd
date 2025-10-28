import axios from 'axios';

const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || 'http://log-service:3003';
const LOG_REQUEST_TIMEOUT = parseInt(process.env.LOG_REQUEST_TIMEOUT || '1000');
const SERVICE_NAME = 'gateway';

class Logger {
	async log(level: string, message: string, metadata: any = {}) {
		try {
			await axios.post(`${LOG_SERVICE_URL}/api/logs`, {
				level,
				message,
				service: SERVICE_NAME,
				metadata,
				timestamp: new Date().toISOString()
			}, {
				timeout: LOG_REQUEST_TIMEOUT,
				validateStatus: () => true
			});
		} catch (error) {
			console.log(`[${level.toUpperCase()}] [${SERVICE_NAME}]`, message, metadata);
		}
	}

	info(message: string, metadata?: any) {
		return this.log('info', message, metadata);
	}

	error(message: string, metadata?: any) {
		return this.log('error', message, metadata);
	}

	warn(message: string, metadata?: any) {
		return this.log('warn', message, metadata);
	}

	debug(message: string, metadata?: any) {
		return this.log('debug', message, metadata);
	}
}

export default new Logger();