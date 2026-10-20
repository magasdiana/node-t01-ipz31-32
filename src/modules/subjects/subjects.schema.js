import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Назва гуртка є обов’язковою'),
});

export const updateSubjectSchema = createSubjectSchema.partial();
