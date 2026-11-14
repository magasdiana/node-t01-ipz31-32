const errorBody = { "application/json": { schema: { type: "object" } } };

const userSchema = {
  type: "object",
  description: "Користувач. Хеш пароля ніколи не повертається.",
  properties: {
    id: { type: "integer", example: 1 },
    login: { type: "string", example: "admin" },
    role: {
      type: "string",
      enum: ["admin", "manager", "parent", "teacher"],
    },
  },
};

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer", minimum: 1 },
};

export default {
  paths: {
    "/users": {
      get: {
        tags: ["Users"],
        summary: "Список користувачів (Admin)",
        responses: {
          200: {
            description: "Користувачі без хешів паролів",
            content: {
              "application/json": {
                schema: { type: "array", items: userSchema },
              },
            },
          },
          401: { description: "Немає або недійсний токен", content: errorBody },
          403: { description: "Недостатньо прав", content: errorBody },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Створити користувача (Admin)",
        description:
          "Пароль хешується bcrypt, у БД зберігається лише хеш. Логін унікальний (без урахування регістру).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["login", "password", "role"],
                properties: {
                  login: {
                    type: "string",
                    example: "olena.parent",
                    description: "3–50 символів: a-z, 0-9, крапка, дефіс, підкреслення",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    minLength: 8,
                    example: "Str0ng#Pass",
                  },
                  role: {
                    type: "string",
                    enum: ["admin", "manager", "parent", "teacher"],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Користувача створено",
            content: { "application/json": { schema: userSchema } },
          },
          400: { description: "Помилка валідації", content: errorBody },
          401: { description: "Немає або недійсний токен", content: errorBody },
          403: { description: "Недостатньо прав", content: errorBody },
          409: { description: "Логін уже зайнятий", content: errorBody },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Користувач за id (Admin)",
        parameters: [idParam],
        responses: {
          200: {
            description: "Користувач",
            content: { "application/json": { schema: userSchema } },
          },
          400: { description: "Некоректний id", content: errorBody },
          401: { description: "Немає або недійсний токен", content: errorBody },
          403: { description: "Недостатньо прав", content: errorBody },
          404: { description: "Користувача не знайдено", content: errorBody },
        },
      },
    },
  },
};
