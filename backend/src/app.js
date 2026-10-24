import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound, errorHandler } from './middleware/errors.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
