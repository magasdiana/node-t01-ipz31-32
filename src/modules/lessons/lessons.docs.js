// OpenAPI-опис ендпоінтів модуля lessons (NFR-03)

const idPathParam = (description) => ({
  name: "id",
  in: "path",
  required: true,
  description,
  schema: { type: "integer", minimum: 1 },
});

const lessonSchema = {
  type: "object",
  properties: {
    id: { type: "integer", example: 12 },
    groupId: { type: "integer", example: 1 },
    subjectId: { type: "integer", example: 3 },
    staffId: { type: "integer", example: 5 },
    day: {
      type: "integer",
      minimum: 1,
      maximum: 5,
      description: "День тижня: 1 = понеділок ... 5 = п'ятниця",
      example: 2,
    },
    start: { type: "string", example: "09:30", description: "Формат HH:MM" },
    duration: { type: "integer", example: 30, description: "Хвилини" },
  },
};

const errorSchema = (status, message) => ({
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        status: { type: "integer", example: status },
        message: { type: "string", example: message },
      },
    },
  },
});

const lessonsDocs = {
  paths: {
    "/groups/{id}/lessons": {
      get: {
        tags: ["Lessons"],
        summary: "Розклад групи",
        description:
          "Повертає заняття групи, відсортовані за днем і часом початку.",
        parameters: [idPathParam("ID групи")],
        responses: {
          200: {
            description: "Заняття групи (порожній масив, якщо розкладу ще немає)",
            content: {
              "application/json": {
                schema: { type: "array", items: lessonSchema },
              },
            },
          },
          400: { description: "Некоректний id" },
          404: {
            description: "Групу не знайдено",
            content: {
              "application/json": {
                schema: errorSchema(404, "Групу не знайдено"),
              },
            },
          },
        },
      },
    },
    "/lessons/{id}": {
      patch: {
        tags: ["Lessons"],
        summary: "Змінити день або час заняття",
        description:
          "Приймає day і/або start. Перед збереженням перевіряє накладки " +
          "за викладачем, групою та кімнатою (FR-19). Якщо є конфлікт, " +
          "повертає 409 зі списком конфліктів у details.",
        parameters: [idPathParam("ID заняття")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                minProperties: 1,
                additionalProperties: false,
                properties: {
                  day: { type: "integer", minimum: 1, maximum: 5, example: 3 },
                  start: { type: "string", example: "10:00" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Заняття оновлено",
            content: { "application/json": { schema: lessonSchema } },
          },
          400: { description: "Некоректні дані (формат часу, день 1-5, порожнє тіло)" },
          404: {
            description: "Заняття або його групу не знайдено",
            content: {
              "application/json": {
                schema: errorSchema(404, "Заняття не знайдено"),
              },
            },
          },
          409: {
            description: "Конфлікт із поточним розкладом",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "object",
                      properties: {
                        status: { type: "integer", example: 409 },
                        message: {
                          type: "string",
                          example:
                            "Не можна перенести заняття: конфлікт із поточним розкладом",
                        },
                        details: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              type: {
                                type: "string",
                                enum: ["teacher", "group", "room"],
                              },
                              message: {
                                type: "string",
                                example:
                                  "Викладач (id 5) уже веде інше заняття: вівторок 09:30-10:00",
                              },
                              conflictingLesson: lessonSchema,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default lessonsDocs;
