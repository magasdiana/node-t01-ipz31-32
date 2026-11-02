
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
