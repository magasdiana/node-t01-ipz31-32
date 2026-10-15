import { z } from "zod";

export const roomCreateSchema = z.object({
  name: z.string().trim().min(1, "Вкажіть назву кімнати"),
  cost: z.coerce.number().finite().nonnegative().optional(),
});

export const roomUpdateSchema = roomCreateSchema.partial();

export const roomIdSchema = z.coerce.number().int().positive();
