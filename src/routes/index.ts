import { Router } from 'express';
import { authRouter } from './auth.router';
import { usersRouter } from './users.router';
import { accountsRouter } from './accounts.router';
import { transactionsRouter } from './transactions.router';
import { transfersRouter } from './transfers.router';
import { beneficiariesRouter } from './beneficiaries.router';
import { cardsRouter } from './cards.router';
import { sessionsRouter } from './sessions.router';
import { notificationsRouter } from './notifications.router';
import { healthRouter } from './health.router';
import { adminRouter } from './admin.router';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/accounts', accountsRouter);
apiRouter.use('/transactions', transactionsRouter);
apiRouter.use('/transfers', transfersRouter);
apiRouter.use('/beneficiaries', beneficiariesRouter);
apiRouter.use('/cards', cardsRouter);
apiRouter.use('/sessions', sessionsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/admin', adminRouter);

