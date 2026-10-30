import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { checkDb } from './db/pool.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound, errorHandler } from './middleware/errors.js';
import { authRouter } from './routes/auth.js';
import { staffRouter } from './routes/staff.js';
import { patientsRouter } from './routes/patients.js';
import { appointmentsRouter } from './routes/appointments.js';
import { publicRouter } from './routes/public.js';
import { catalogRouter } from './routes/catalog.js';
import { billingRouter } from './routes/billing.js';
import { labRouter } from './routes/lab.js';
import { prescriptionsRouter } from './routes/prescriptions.js';
import { publicFeedbackRouter, feedbackRouter } from './routes/feedback.js';
import { doctorsRouter } from './routes/doctors.js';
import { reportsRouter } from './routes/reports.js';
import { settingsRouter } from './routes/settings.js';

function requireSameOrigin(req, res, next) {
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const origin = req.get('origin');
  if (unsafe && origin && origin !== config.FRONTEND_ORIGIN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_ORIGIN, credentials: true }));
  app.use(requireSameOrigin);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/health/db', async (req, res) => {
    try {
      await checkDb();
      res.json({ status: 'ok' });
    } catch (err) {
      console.error('DB health check failed:', err.code || err.message);
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/public/feedback', publicFeedbackRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/lab', labRouter);
  app.use('/api/prescriptions', prescriptionsRouter);
  app.use('/api/feedback', feedbackRouter);
  app.use('/api/doctors', doctorsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/settings', settingsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
