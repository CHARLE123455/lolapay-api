import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sessionIdSchema } from '../validation/sessions.schemas';
import * as sessions from '../controllers/sessions.controllers';

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

sessionsRouter.get('/', sessions.list);
sessionsRouter.delete('/:id', validate({ params: sessionIdSchema }), sessions.revoke);
