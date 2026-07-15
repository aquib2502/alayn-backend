import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection! Shutting down...', err);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  logger.warn('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
  });
});
