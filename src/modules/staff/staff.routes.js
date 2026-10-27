import { Router } from 'express';
import { staffController } from './staff.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createStaffValidation,
  updateStaffValidation,
  getOrDeleteStaffValidation,
} from './staff.schema.js';

const router = Router();

router.get('/', staffController.getAll);
router.get('/:id', validate(getOrDeleteStaffValidation), staffController.getById);
router.post('/', validate(createStaffValidation), staffController.create);
router.patch('/:id', validate(updateStaffValidation), staffController.update);
router.delete('/:id', validate(getOrDeleteStaffValidation), staffController.delete);

export default router;