import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './src/config/env';
import { errorHandler, notFoundHandler } from './src/middleware/error';
import { apiRouter } from './src/routes';

export function createApp() {
    const app = express();

    app.set('trust proxy', 1);
    app.use(helmet());
    app.use(
        cors({
            origin: (origin, cb) => {
                if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) return cb(null, true);
                return cb(new Error(`Origin ${origin} not allowed by CORS`));
            },
            credentials: true,
        }),
    );
    app.use(express.json({ limit: '100kb' }));
    app.use(cookieParser());
    if (env.NODE_ENV !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));
    app.use(rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

    app.get('/', (_req, res) => res.json({ name: 'LolaPay API', version: '1.0.0', health: '/api/v1/health' }));
    app.use('/api/v1', apiRouter);

    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}
