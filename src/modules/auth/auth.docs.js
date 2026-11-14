const errorBody = { "application/json": { schema: { type: "object" } } };

export default {
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Вхід: отримати JWT",
        description:
          "Публічний маршрут. Токен передається далі в заголовку `Authorization: Bearer <token>`. Термін дії задає JWT_EXPIRES_IN (за замовчуванням 8h).",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["login", "password"],
                properties: {
                  login: { type: "string", example: "admin" },
                  password: {
                    type: "string",
                    format: "password",
                    example: "Admin#2026",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Успішний вхід. passwordHash у відповіді немає.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "integer", example: 1 },
                        login: { type: "string", example: "admin" },
                        role: {
                          type: "string",
                          enum: ["admin", "manager", "parent", "teacher"],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Не вказано логін або пароль", content: errorBody },
          401: { description: "Невірний логін або пароль", content: errorBody },
        },
      },
    },
  },
};
