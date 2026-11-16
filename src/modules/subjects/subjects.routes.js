import { Router } from 'express';
import { subjectsController } from './subjects.controller.js';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/auth.js';
import { ACCESS } from '../../config/access.js';
import {
  createSubjectValidation,
  updateSubjectValidation,
  getOrDeleteSubjectValidation,
} from './subjects.schema.js';

const router = Router();

router.get('/', authorize(ACCESS.SUBJECTS_ALL), subjectsController.getAll);
router.get('/:id', authorize(ACCESS.SUBJECTS_ALL), validate(getOrDeleteSubjectValidation), subjectsController.getById);
router.post('/', authorize(ACCESS.SUBJECTS_ALL), validate(createSubjectValidation), subjectsController.create);
router.patch('/:id', authorize(ACCESS.SUBJECTS_ALL), validate(updateSubjectValidation), subjectsController.update);
router.delete('/:id', authorize(ACCESS.SUBJECTS_ALL), validate(getOrDeleteSubjectValidation), subjectsController.delete);

export default router;
