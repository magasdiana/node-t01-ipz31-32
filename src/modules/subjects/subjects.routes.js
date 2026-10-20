import { Router } from 'express';
import { subjectsController } from './subjects.controller.js';
import { validate } from '../../middleware/validate.js';
import { createSubjectSchema, updateSubjectSchema } from './subjects.schema.js';

const router = Router();

router.get('/', subjectsController.getAll);
router.get('/:id', subjectsController.getById);
router.post('/', validate(createSubjectSchema), subjectsController.create);
router.patch('/:id', validate(updateSubjectSchema), subjectsController.update);

export default router;