const groupsDocs = {
  paths: {
    "/groups": {
      get: {
        tags: ["Groups"],
        summary: "Отримати список груп",
        responses: {
          200: {
            description: "Список груп із кількістю дітей",
          },
        },
      },
      post: {
        tags: ["Groups"],
        summary: "Створити групу",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "age"],
                properties: {
                  name: { type: "string", example: "Молодша група" },
                  age: { type: "integer", example: 3 },
                  limit: { type: "integer", example: 20 },
                  roomId: { type: "integer", nullable: true, example: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Групу створено" },
          400: { description: "Некоректні дані" },
          409: { description: "Порушено бізнес-правила" },
        },
      },
    },
    "/groups/{id}": {
      get: {
        tags: ["Groups"],
        summary: "Отримати групу за ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: { description: "Дані групи" },
          404: { description: "Групу не знайдено" },
        },
      },
      patch: {
        tags: ["Groups"],
        summary: "Оновити групу",
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
                  age: { type: "integer" },
                  limit: { type: "integer" },
                  roomId: { type: "integer", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Групу оновлено" },
          400: { description: "Некоректні дані" },
          404: { description: "Групу не знайдено" },
          409: { description: "Порушено бізнес-правила" },
        },
      },
      delete: {
        tags: ["Groups"],
        summary: "Видалити групу",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          204: { description: "Групу видалено" },
          404: { description: "Групу не знайдено" },
          409: { description: "Групу не можна видалити" },
        },
      },
    },
  },
};

export default groupsDocs;