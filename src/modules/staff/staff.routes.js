import { Router } from 'express';
import { staffController } from './staff.controller.js';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/auth.js';
import { ownSchedule } from '../../middleware/teacherOwnership.js';
import { ACCESS } from '../../config/access.js';
import {
  createStaffValidation,
  updateStaffValidation,
  getOrDeleteStaffValidation,
  staffScheduleValidation,
} from './staff.schema.js';

const router = Router();

router.get('/', authorize(ACCESS.STAFF_ALL), staffController.getAll);
router.get('/:id', authorize(ACCESS.STAFF_ALL), validate(getOrDeleteStaffValidation), staffController.getById);
router.post('/', authorize(ACCESS.STAFF_ALL), validate(createStaffValidation), staffController.create);
router.patch('/:id', authorize(ACCESS.STAFF_ALL), validate(updateStaffValidation), staffController.update);
router.delete('/:id', authorize(ACCESS.STAFF_ALL), validate(getOrDeleteStaffValidation), staffController.delete);

// Admin бачить будь-який розклад, Teacher лише свій (staff.user_id = req.user.id)
router.get(
  '/:id/schedule',
  authorize(ACCESS.STAFF_SCHEDULE),
  validate(staffScheduleValidation),
  ownSchedule,
  staffController.getSchedule,
);

export default router;
