import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { eventBus } from './events/bus';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { accountsRouter } from './modules/accounts/accounts.routes';
import { transactionsRouter } from './modules/transactions/transactions.routes';
import { transfersRouter } from './modules/transfers/transfers.routes';
import { beneficiariesRouter } from './modules/beneficiaries/beneficiaries.routes';
import { cardsRouter } from './modules/cards/cards.routes';
import { sessionsRouter } from './modules/sessions/sessions.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';

export function createApp() {
    const app = express();

    app.set('trust proxy', 1);
    app.use(helmet());
    app.use(
        cors({
            origin: (origin, cb) => {
                // allow non-browser clients (Postman, mobile) and whitelisted origins
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

    app.get('/', (_req, res) => res.json({ name: 'LolaPay API', version: '1.0.0', docs: '/api/v1/health' }));
    app.get('/api/v1/health', async (_req, res) => {
        let db = 'ok';
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch {
            db = 'down';
        }
        res.status(db === 'ok' ? 200 : 503).json({
            status: db === 'ok' ? 'ok' : 'degraded',
            db,
            eventBus: eventBus.kind,
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    });

    const api = express.Router();
    api.use('/auth', authRouter);
    api.use('/users', usersRouter);
    api.use('/accounts', accountsRouter);
    api.use('/transactions', transactionsRouter);
    api.use('/transfers', transfersRouter);
    api.use('/beneficiaries', beneficiariesRouter);
    api.use('/cards', cardsRouter);
    api.use('/sessions', sessionsRouter);
    api.use('/notifications', notificationsRouter);
    app.use('/api/v1', api);

    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}
