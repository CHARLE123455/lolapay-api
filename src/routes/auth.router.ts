import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../src/config/env';
import { requireAuth } from '../../src/middleware/auth';
import { validate } from '../../src/middleware/validate';
import * as authController from '../controllers/auth.controller';
import { changePasswordSchema, googleTokenSchema, loginSchema, refreshSchema, registerSchema } from '../validation/auth.schemas';

export const authRouter = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === 'test' ? 1000 : 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' },
});

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
authRouter.post('/refresh', validate({ body: refreshSchema }), authController.refresh);
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.post('/logout-all', requireAuth, authController.logoutAll);
authRouter.post('/change-password', requireAuth, validate({ body: changePasswordSchema }), authController.changePassword);

authRouter.get('/google', authController.googleRedirect);
authRouter.get('/google/callback', authController.googleCallback);
authRouter.post('/google/token', authLimiter, validate({ body: googleTokenSchema }), authController.googleToken);

authRouter.get('/providers', authController.providers);