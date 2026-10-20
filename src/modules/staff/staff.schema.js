import { z } from 'zod';

const ALLOWED_POSITIONS = ['teacher', 'educator', 'assistant', 'admin', 'manager'];

export const createStaffSchema = z.object({
  name: z.string().min(1, 'Ім’я співробітника обов’язкове'),
  position: z.enum(ALLOWED_POSITIONS, {
    errorMap: () => ({ message: 'Невалідна посада співробітника' }),
  }),
  salary: z.number().positive().optional(),
  allowance: z.number().min(0).optional(),
  groupId: z.number().optional().nullable(),
  group_id: z.number().optional().nullable(),
  subjectIds: z.array(z.number()).optional(),
});

export const updateStaffSchema = createStaffSchema.partial();