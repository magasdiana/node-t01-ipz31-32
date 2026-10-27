import { z } from "zod";
import { idParam, isoDate } from "../../lib/schemas.js";
import { LIMITS } from "../../config/constants.js";

const maxParents = LIMITS?.PARENTS_MAX ?? 3;

const groupIdSchema = z.union([
  z.coerce.number().int().positive(),
  z.null(),
]);

// 1. Схеми тіла запиту (body)
export const createChildSchema = z.object({
  name: z.string().trim().min(1, "Вкажіть ім'я дитини"),
  birthDate: isoDate,
  guardians: z
    .array(z.string().trim().min(1, "Ім'я опікуна не може бути порожнім"))
    .max(maxParents, `Максимум ${maxParents} опікунів`)
    .optional(),
  relativeVip: z.boolean().optional(),
  preferences: z.any().optional(),
  benefitType: z.enum(["none", "min", "medium", "max"]).optional(),
  groupId: groupIdSchema.optional(),
  group_id: groupIdSchema.optional(),
});

export const updateChildSchema = createChildSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "Тіло запиту на оновлення не може бути порожнім" }
  );

// 2. Спільні обгортки для validate(schema)
export const createChildValidation = z.object({
  body: createChildSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateChildValidation = z.object({
  body: updateChildSchema,
  params: idParam,
  query: z.object({}).optional(),
});

export const getOrDeleteChildValidation = z.object({
  body: z.object({}).optional(),
  params: idParam,
  query: z.object({}).optional(),
});