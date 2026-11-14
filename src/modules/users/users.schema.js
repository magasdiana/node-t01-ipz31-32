import { z } from "zod";
import { idParam } from "../../lib/schemas.js";
import { ROLE_VALUES } from "../../config/roles.js";
import { fitsBcrypt, MAX_PASSWORD_BYTES } from "../../lib/password.js";

export const createUserSchema = z.object({
  login: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9._-]{3,50}$/,
      "Логін: 3–50 символів, лише латиниця, цифри, крапка, дефіс і підкреслення",
    ),
  password: z
    .string()
    .min(8, "Пароль має містити щонайменше 8 символів")
    .refine(fitsBcrypt, `Пароль не може бути довшим за ${MAX_PASSWORD_BYTES} байтів`),
  role: z.enum(ROLE_VALUES, {
    error: `Роль має бути однією з: ${ROLE_VALUES.join(", ")}`,
  }),
});

export const createUserValidation = z.object({
  body: createUserSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const getUserValidation = z.object({
  body: z.object({}).optional(),
  params: idParam,
  query: z.object({}).optional(),
});
