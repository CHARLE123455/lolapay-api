import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { listTransfersSchema, listUsersSchema, updateUserRoleSchema, updateUserStatusSchema, userIdSchema } from '../validation/admin.schemas';
import * as admin from '../controllers/admin.controller';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/overview', admin.overview);

adminRouter.get('/users', validate({ query: listUsersSchema }), admin.listUsers);
adminRouter.get('/users/:id', validate({ params: userIdSchema }), admin.getUser);
adminRouter.patch('/users/:id/status', validate({ params: userIdSchema, body: updateUserStatusSchema }), admin.setUserStatus);
adminRouter.patch('/users/:id/role', validate({ params: userIdSchema, body: updateUserRoleSchema }), admin.setUserRole);

adminRouter.get('/transfers', validate({ query: listTransfersSchema }), admin.listTransfers);

