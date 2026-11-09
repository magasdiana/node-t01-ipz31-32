const errorBody = { "application/json": { schema: { type: "object" } } };

const entry = {
  type: "object",
  properties: {
    id: { type: "integer", example: 7 },
    entity: { type: "string", example: "child" },
    entityId: { type: "integer", example: 1 },
    action: { type: "string", enum: ["create", "update", "upsert", "delete"] },
    changes: { type: "object" },
    createdAt: {
      type: "string",
      format: "date-time",
      example: "2026-10-05T09:00:00.000Z",
    },
    actor: {
      nullable: true,
      description: "Завжди null: авторизації в системі немає",
    },
    requestId: {
      type: "string",
      description: "Ідентифікатор запиту, який спричинив зміну",
    },
    source: { type: "string", example: "api" },
  },
};

const list = {
  type: "object",
  properties: {
    items: { type: "array", items: entry },
    total: { type: "integer" },
    limit: { type: "integer" },
    offset: { type: "integer" },
  },
};

const q = (name, schema, description) => ({
  name,
  in: "query",
  required: false,
  schema,
  description,
});
const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer", minimum: 1 },
};

const commonQuery = [
  q("action", {
    type: "string",
    enum: ["create", "update", "upsert", "delete"],
  }),
  q(
    "from",
    { type: "string", format: "date" },
    "Від дати (YYYY-MM-DD), включно",
  ),
  q("to", { type: "string", format: "date" }, "До дати (YYYY-MM-DD), включно"),
  q("limit", { type: "integer", minimum: 1, maximum: 200, default: 50 }),
  q("offset", { type: "integer", minimum: 0, default: 0 }),
];

const entityHistory = (summary) => ({
  get: {
    tags: ["History"],
    summary,
    parameters: [idParam, ...commonQuery],
    responses: {
      200: {
        description: "Історія запису, нові зверху",
        content: { "application/json": { schema: list } },
      },
      400: { description: "Невалідний id або фільтр", content: errorBody },
      404: { description: "Запис не знайдено", content: errorBody },
    },
  },
});

export default {
  paths: {
    "/history": {
      get: {
        tags: ["History"],
        summary: "Історія змін з фільтрами",
        description:
          "Лише читання. Записи створює система, змінити чи видалити їх не можна.",
        parameters: [
          q("entity", { type: "string", example: "child" }),
          q("entityId", { type: "integer", minimum: 1 }),
          ...commonQuery,
        ],
        responses: {
          200: {
            description: "Сторінка історії, нові зверху",
            content: { "application/json": { schema: list } },
          },
          400: { description: "Невалідний фільтр", content: errorBody },
        },
      },
    },
    "/history/state": {
      get: {
        tags: ["History"],
        summary: "Стан історії",
        description: "Кількість записів і останній запис.",
        responses: {
          200: {
            description: "Стан",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    total: { type: "integer" },
                    last: { ...entry, nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/history/{id}": {
      get: {
        tags: ["History"],
        summary: "Запис історії за id",
        parameters: [idParam],
        responses: {
          200: {
            description: "Запис історії",
            content: { "application/json": { schema: entry } },
          },
          400: { description: "Некоректний id", content: errorBody },
          404: { description: "Запис історії не знайдено", content: errorBody },
        },
      },
    },
    "/children/{id}/history": { ...entityHistory("Історія змін дитини") },
    "/groups/{id}/history": { ...entityHistory("Історія змін групи") },
  },
};
