import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { listTransfersSchema, sendMoneySchema, transferIdSchema } from '../validation/transfers.schemas';
import * as transfers from '../controllers/transfers.controller';

export const transfersRouter = Router();
transfersRouter.use(requireAuth);

transfersRouter.post('/', validate({ body: sendMoneySchema }), transfers.send);
transfersRouter.get('/', validate({ query: listTransfersSchema }), transfers.list);
transfersRouter.get('/:id', validate({ params: transferIdSchema }), transfers.getById);
