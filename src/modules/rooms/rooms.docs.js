const roomsDocs = {
  paths: {
    "/rooms": {
      get: {
        tags: ["Rooms"],
        summary: "Отримати список приміщень",
        responses: {
          200: {
            description: "Список приміщень",
          },
        },
      },
      post: {
        tags: ["Rooms"],
        summary: "Створити приміщення",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    example: "Кімната 101",
                  },
                  cost: {
                    type: "number",
                    example: 50000,
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Приміщення створено" },
          400: { description: "Некоректні дані" },
          409: { description: "Порушено бізнес-правила" },
        },
      },
    },
    "/rooms/{id}": {
      get: {
        tags: ["Rooms"],
        summary: "Отримати приміщення за ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: { description: "Дані приміщення" },
          404: { description: "Приміщення не знайдено" },
        },
      },
      patch: {
        tags: ["Rooms"],
        summary: "Оновити приміщення",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  cost: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Приміщення оновлено" },
          400: { description: "Некоректні дані" },
          404: { description: "Приміщення не знайдено" },
        },
      },
      delete: {
        tags: ["Rooms"],
        summary: "Видалити приміщення",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          204: { description: "Приміщення видалено" },
          404: { description: "Приміщення не знайдено" },
          409: { description: "Приміщення використовується групою" },
        },
      },
    },
  },
};

export default roomsDocs;