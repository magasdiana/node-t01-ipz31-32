import { z } from 'zod';

export const getProfitSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
  query: z.object({
    groupId: z.string().optional().transform((val) => (val ? Number(val) : undefined)),
  }).optional().default({}),
});

export const getMinRoomsSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});