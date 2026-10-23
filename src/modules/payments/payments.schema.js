import { z } from 'zod';
import { idParam } from '../../lib/schemas.js';

export const createPaymentSchema = z.object({
  childId: z.number({ required_error: 'childId є обов’язковим' }).int().positive(),
  period: z.enum(['month', 'year']).default('month'),
  periodStart: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'periodStart має бути у форматі YYYY-MM')
    .optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Некоректний формат дати'
  }).optional()
});

export const getPaymentsQuerySchema = z.object({
  childId: z.coerce.number().int().positive().optional()
});

export const createPaymentValidation = z.object({
  body: createPaymentSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const getPaymentsValidation = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: getPaymentsQuerySchema.optional(),
});

export const getOrDeletePaymentValidation = z.object({
  body: z.object({}).optional(),
  params: idParam,
  query: z.object({}).optional(),
});