import { Router } from 'express';
import * as beneficiary from '../controllers/beneficiaries.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { beneficiaryIdSchema, createBeneficiarySchema, listBeneficiariesSchema, updateBeneficiarySchema } from '../validation/beneficiaries.schemas';

export const beneficiariesRouter = Router();
beneficiariesRouter.use(requireAuth);

beneficiariesRouter.get('/', validate({ query: listBeneficiariesSchema }), beneficiary.list);
beneficiariesRouter.get('/followers', beneficiary.followers);
beneficiariesRouter.post('/', validate({ body: createBeneficiarySchema }), beneficiary.create);
beneficiariesRouter.patch('/:id', validate({ params: beneficiaryIdSchema, body: updateBeneficiarySchema }), beneficiary.update);
beneficiariesRouter.delete('/:id', validate({ params: beneficiaryIdSchema }), beneficiary.remove);
