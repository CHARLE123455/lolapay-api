import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { cardIdSchema, cardStatusSchema, createCardSchema } from '../validation/cards.schemas';
import * as cards from '../controllers/cards.controller';

export const cardsRouter = Router();
cardsRouter.use(requireAuth);

cardsRouter.get('/', cards.list);
cardsRouter.post('/', validate({ body: createCardSchema }), cards.issue);
cardsRouter.patch('/:id/status', validate({ params: cardIdSchema, body: cardStatusSchema }), cards.setStatus);
cardsRouter.patch('/:id/default', validate({ params: cardIdSchema }), cards.setDefault);
cardsRouter.delete('/:id', validate({ params: cardIdSchema }), cards.cancel);
