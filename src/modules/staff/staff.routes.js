import { Router } from 'express';
import { staffController } from './staff.controller.js';
import { validate } from '../../middleware/validate.js';
import { createStaffSchema, updateStaffSchema } from './staff.schema.js';

const router = Router();

router.get('/', staffController.getAll);
router.get('/:id', staffController.getById);
router.post('/', validate(createStaffSchema), staffController.create);
router.patch('/:id', validate(updateStaffSchema), staffController.update);

export default router;