import { z } from 'zod';
import { idParam } from '../../lib/schemas.js';

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Назва гуртка є обов’язковою'),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const createSubjectValidation = z.object({
  body: createSubjectSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateSubjectValidation = z.object({
  body: updateSubjectSchema,
  params: idParam,
  query: z.object({}).optional(),
});

export const getOrDeleteSubjectValidation = z.object({
  body: z.object({}).optional(),
  params: idParam,
  query: z.object({}).optional(),
});