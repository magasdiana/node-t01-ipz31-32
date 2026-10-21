import { z } from 'zod';

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