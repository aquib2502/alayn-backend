import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { env } from './env';

const stream = env.NODE_ENV === 'development'
  ? pinoPretty({
      colorize: true,
      ignore: 'pid,hostname',
      sync: true,
    })
  : undefined;

export const logger = pino(
  {
    level: env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL || 'info'),
  },
  stream
);

