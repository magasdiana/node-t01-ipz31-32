import { z } from "zod";
import { idParam } from "../../lib/schemas.js";
import { LIMITS } from "../../config/constants.js";

const roomIdSchema = z.union([
  z.coerce.number().int().positive(),
  z.null(),
]);

export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, "Вкажіть назву групи"),
  age: z.coerce.number().int(),
  limit: z.coerce.number().int().positive().max(LIMITS.GROUP_MAX_CHILDREN).optional(),
  roomId: roomIdSchema.optional(),
  room_id: roomIdSchema.optional(),
});

export const groupUpdateSchema = groupCreateSchema.partial();

export const createGroupValidation = z.object({
  body: groupCreateSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateGroupValidation = z.object({
  body: groupUpdateSchema,
  params: idParam,
  query: z.object({}).optional(),
});

export const getOrDeleteGroupValidation = z.object({
  body: z.object({}).optional(),
  params: idParam,
  query: z.object({}).optional(),
});