import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { listTransactionsSchema, transactionIdSchema } from '../validation/transactions.schemas';
import * as transactions from '../controllers/transactions.controller';

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

transactionsRouter.get('/', validate({ query: listTransactionsSchema }), transactions.list);
transactionsRouter.get('/:id', validate({ params: transactionIdSchema }), transactions.getById);
