import { Router } from 'express';
import * as health from '../controllers/health.controller';

export const healthRouter = Router();
healthRouter.get('/', health.check);
