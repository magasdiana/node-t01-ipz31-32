import { Router } from 'express';
import { subjectsController } from './subjects.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createSubjectValidation,
  updateSubjectValidation,
  getOrDeleteSubjectValidation,
} from './subjects.schema.js';

const router = Router();

router.get('/', subjectsController.getAll);
router.get('/:id', validate(getOrDeleteSubjectValidation), subjectsController.getById);
router.post('/', validate(createSubjectValidation), subjectsController.create);
router.patch('/:id', validate(updateSubjectValidation), subjectsController.update);
router.delete('/:id', validate(getOrDeleteSubjectValidation), subjectsController.delete);

export default router;