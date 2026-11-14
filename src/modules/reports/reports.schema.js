import { z } from 'zod';

export const getProfitSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
  query: z.object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
        message: 'month повинен мати формат YYYY-MM',
      })
      .optional(),

    groupId: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : undefined))
      .refine((val) => val === undefined || (Number.isInteger(val) && val > 0), {
        message: 'groupId має бути додатним цілим числом',
      }),
  }).optional().default({}),
});

export const getMinRoomsSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});

export const getForecastProfitSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
  query: z.object({
    groups: z.string()
      .regex(/^[1-9]\d*$/, 'groups має бути додатним цілим числом')
      .optional()
      .transform(v => v === undefined ? undefined : Number(v))
      .refine(
        v => v === undefined || (Number.isSafeInteger(v) && v <= 50),
        'groups має бути від 1 до 50'
      ),

    children: z.string()
      .regex(/^\d+(,\d+)*$/, 'children: число або список чисел через кому')
      .optional(),

    months: z.string()
      .regex(/^(?:[1-9]|1[0-2])$/, 'months має бути від 1 до 12')
      .optional()
      .transform(v => v === undefined ? 3 : Number(v)),
  }).optional().default({}),
});