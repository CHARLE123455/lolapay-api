import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { summaryQuerySchema } from '../validation/accounts.schemas';
import * as accounts from '../controllers/accounts.controller';

export const accountsRouter = Router();
accountsRouter.use(requireAuth);

accountsRouter.get('/me', accounts.me);
accountsRouter.get('/me/summary', validate({ query: summaryQuerySchema }), accounts.summary);
