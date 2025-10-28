import axios from 'axios';

const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || 'http://log-service:3003';
const SERVICE_NAME = 'tournament-service';

class Logger {
  async log(level, message, metadata = {}) {
    try {
      await axios.post(`${LOG_SERVICE_URL}/api/logs`, {
        level,
        message,
        service: SERVICE_NAME,
        metadata,
        timestamp: new Date().toISOString()
      }, { timeout: parseInt(process.env.LOG_REQUEST_TIMEOUT || '1000'), validateStatus: () => true });
    } catch (error) {
      console.log(`[${level.toUpperCase()}] [${SERVICE_NAME}]`, message, metadata);
    }
  }

  info(message, metadata) { return this.log('info', message, metadata); }
  error(message, metadata) { return this.log('error', message, metadata); }
  warn(message, metadata) { return this.log('warn', message, metadata); }
  debug(message, metadata) { return this.log('debug', message, metadata); }
}

export default new Logger();