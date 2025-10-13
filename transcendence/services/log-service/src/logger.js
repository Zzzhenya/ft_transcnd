const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

// Configurar formato de logs
const logFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.errors({ stack: true }),
	winston.format.json()
);

// Configuración de Elasticsearch
const esTransportOpts = {
	level: 'info',
	clientOpts: {
		node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
		maxRetries: 5,
		requestTimeout: 10000,
	},
	index: 'transcendence-logs',
};

// Crear transports
const transports = [
	// Console (siempre disponible)
	new winston.transports.Console({
		format: winston.format.combine(
			winston.format.colorize(),
			winston.format.simple()
		)
	})
];

// Agregar Elasticsearch solo si está configurado
if (process.env.ELASTICSEARCH_URL) {
	transports.push(new ElasticsearchTransport(esTransportOpts));
}

// Crear logger
const logger = winston.createLogger({
	level: 'info',
	format: logFormat,
	defaultMeta: {
		service: 'log-service',
		environment: process.env.NODE_ENV || 'development'
	},
	transports,
});

module.exports = logger;