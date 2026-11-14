import { z } from "zod";

// Логін порівнюється без урахування регістру: у БД він у нижньому регістрі
export const loginSchema = z.object({
  login: z.string().trim().toLowerCase().min(1, "Вкажіть логін").max(100),
  password: z.string().min(1, "Вкажіть пароль").max(200),
});

export const loginValidation = z.object({
  body: loginSchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
