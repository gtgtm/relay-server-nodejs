const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'relay-server' },
  transports: [
    // Write all logs with importance level of error or less to a separate file
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of info or less to a separate file
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Always log to console (Render filesystem is ephemeral, file logs are lost on deploy)
logger.add(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} [${level}]: ${message}`;
      }),
    ),
  }),
);

module.exports = logger;
