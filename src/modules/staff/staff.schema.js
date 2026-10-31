import { z } from 'zod';
import { idParam } from '../../lib/schemas.js';

const ALLOWED_POSITIONS = ['teacher', 'caregiver', 'educator', 'assistant', 'admin', 'manager'];

export const createStaffSchema = z.object({
  name: z.string().min(1, 'Ім’я співробітника обов’язкове'),
  position: z.enum(ALLOWED_POSITIONS, {
    errorMap: () => ({ message: 'Невалідна посада співробітника' }),
  }),
  salary: z.number().positive().optional(),
  allowance: z.number().min(0).optional(),
  groupId: z.coerce.number().int().positive().optional().nullable(),
  group_id: z.coerce.number().int().positive().optional().nullable(),
  subjectIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const updateStaffSchema = createStaffSchema.partial();

export const createStaffValidation = z.object({
  body: createStaffSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateStaffValidation = z.object({
  body: updateStaffSchema,
  params: idParam,
  query: z.object({}).optional(),
});

export const getOrDeleteStaffValidation = z.object({
  body: z.object({}).optional(),
  params: idParam,
  query: z.object({}).optional(),
});

export const staffScheduleValidation = getOrDeleteStaffValidation;