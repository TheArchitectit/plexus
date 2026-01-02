import winston from 'winston';

try {
    const logger = winston.createLogger({
        level: 'deug', // Invalid level
        transports: [
            new winston.transports.Console()
        ]
    });
    logger.info("Logger initialized");
} catch (e) {
    console.error("Logger failed:", e);
}
