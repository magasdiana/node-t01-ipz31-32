import { z } from "zod";
import { idParam } from "../../lib/schemas.js";

export const roomCreateSchema = z.object({
  name: z.string().trim().min(1, "Вкажіть назву кімнати"),
  cost: z.coerce.number().finite().nonnegative().optional(),
});

export const roomUpdateSchema = roomCreateSchema.partial();

export const createRoomValidation = z.object({
  body: roomCreateSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateRoomValidation = z.object({
  body: roomUpdateSchema,
  params: idParam,
  query: z.object({}).optional(),
});

export const getOrDeleteRoomValidation = z.object({
  body: z.object({}).optional(),
  params: idParam,
  query: z.object({}).optional(),
});