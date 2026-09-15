import { Router } from 'express';
import { requireAuth } from '../../src/middleware/auth';
import { validate } from '../../src/middleware/validate';
import * as usersController from '../controllers/users.controller';
import { searchSchema, updateProfileSchema, updateSettingsSchema } from '../validation/users.schemas';
import { uploadAvatar } from '../middleware/uploads';
import * as uploads from '../controllers/uploads.controller';


export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get('/me', usersController.getMe);
usersRouter.patch('/me', validate({ body: updateProfileSchema }), usersController.updateMe);
usersRouter.get('/me/settings', usersController.getSettings);
usersRouter.patch('/me/settings', validate({ body: updateSettingsSchema }), usersController.updateSettings);
usersRouter.delete('/me', usersController.deleteMe);
usersRouter.post('/me/avatar', uploadAvatar, uploads.setAvatar);
usersRouter.delete('/me/avatar', uploads.removeAvatar);
usersRouter.get('/search', validate({ query: searchSchema }), usersController.search);
usersRouter.get('/:tag', usersController.getByTag);