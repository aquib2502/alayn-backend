import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

import { prisma } from './config/prisma';

const server = app.listen(env.PORT, async () => {
  logger.info(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  try {
    await prisma.$connect();
    logger.info('Database Connection Established Successfully');
  } catch (error: any) {
    logger.error(`Failed to connect to the Database: ${error?.message || error}`);
  }
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
