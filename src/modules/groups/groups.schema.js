import { z } from "zod";

const roomIdSchema = z.union([
  z.coerce.number().int().positive(),
  z.null(),
]);

export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, "Вкажіть назву групи"),
  age: z.coerce.number().int(),
  limit: z.coerce.number().int().positive().optional(),
  roomId: roomIdSchema.optional(),
  room_id: roomIdSchema.optional(),
});

export const groupUpdateSchema = groupCreateSchema.partial();

export const groupIdSchema = z.coerce.number().int().positive();
