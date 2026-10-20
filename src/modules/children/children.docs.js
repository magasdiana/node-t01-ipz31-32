// OpenAPI description of the children module endpoints (NFR-03)

const errorResponse = {
  description: "Помилка",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              status: { type: "integer" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
};

const childSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    birthDate: { type: "string", format: "date" },
    age: { type: "integer" },
    guardians: { type: "array", items: { type: "string" }, maxItems: 3 },
    relativeVip: { type: "boolean" },
    preferences: {},
    benefitType: {
      type: "string",
      enum: ["none", "min", "medium", "max"],
    },
    groupId: { type: "integer", nullable: true },
  },
};

const childInput = {
  type: "object",
  required: ["name", "birthDate"],
  properties: {
    name: { type: "string" },
    birthDate: { type: "string", format: "date" },
    guardians: { type: "array", items: { type: "string" } },
    relativeVip: { type: "boolean", default: false },
    preferences: {},
    benefitType: {
      type: "string",
      enum: ["none", "min", "medium", "max"],
    },
    groupId: { type: "integer", nullable: true },
  },
};

export default {
  paths: {
    "/children": {
      get: {
        tags: ["Children"],
        summary: "Отримати список дітей",
        responses: {
          200: {
            description: "Список дітей",
            content: {
              "application/json": {
                schema: { type: "array", items: childSchema },
              },
            },
          },
        },
      },

      post: {
        tags: ["Children"],
        summary: "Створити дитину",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: childInput,
            },
          },
        },
        responses: {
          201: {
            description: "Дитину створено",
            content: {
              "application/json": {
                schema: childSchema,
              },
            },
          },
          400: errorResponse,
          409: errorResponse,
        },
      },
    },

    "/children/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer", minimum: 1 },
        },
      ],

      get: {
        tags: ["Children"],
        summary: "Отримати дитину за ID",
        responses: {
          200: {
            description: "Дані дитини",
            content: {
              "application/json": {
                schema: childSchema,
              },
            },
          },
          404: errorResponse,
        },
      },

      patch: {
        tags: ["Children"],
        summary: "Оновити дитину",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { ...childInput, required: undefined },
            },
          },
        },
        responses: {
          200: { description: "Дитину оновлено" },
          400: errorResponse,
          404: errorResponse,
          409: errorResponse,
        },
      },

      delete: {
        tags: ["Children"],
        summary: "Видалити дитину",
        responses: {
          200: { description: "Дитину видалено" },
          404: errorResponse,
          409: errorResponse,
        },
      },
    },
  },
};
