const errorBody = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        status: { type: "integer" },
        message: { type: "string" },
        details: {},
      },
    },
  },
};

const errorResponse = (description) => ({
  description,
  content: { "application/json": { schema: errorBody } },
});

const scheduledLesson = {
  type: "object",
  properties: {
    id: {
      type: "integer",
      example: 1,
      description: "Є лише у збережених заняттях",
    },
    groupId: { type: "integer", example: 1 },
    subjectId: { type: "integer", example: 2 },
    staffId: { type: "integer", example: 10 },
    day: {
      type: "integer",
      minimum: 1,
      maximum: 5,
      example: 1,
      description: "1 = понеділок",
    },
    start: { type: "string", example: "09:00" },
    duration: { type: "integer", example: 30 },
  },
};

const scheduleResponse = {
  type: "object",
  properties: {
    saved: {
      type: "boolean",
      description: "true: заняття записані в БД. false: лише чернетка",
    },
    lessons: { type: "array", items: scheduledLesson },
    unscheduled: {
      type: "array",
      description:
        "Заняття, які не вдалося розставити. Порожній, якщо все розставлено",
      items: {
        type: "object",
        properties: {
          groupId: { type: "integer" },
          subjectId: { type: "integer" },
          reason: { type: "string" },
        },
      },
    },
  },
};

const forecastScheduleResponse = {
  type: "object",
  properties: {
    lessons: {
      type: "array",
      description: "Заняття, які вдалося запланувати у чернетці",
      items: scheduledLesson,
    },
    unscheduled: {
      type: "array",
      description: "Заняття, які не вдалося розмістити в розкладі",
      items: {
        type: "object",
        properties: {
          groupId: { type: "integer" },
          subjectId: { type: "integer" },
          reason: { type: "string" },
        },
      },
    },
    conflicts: {
      type: "array",
      description: "Виявлені конфлікти у чернетці",
      items: { type: "object" },
    },
    roomsNeeded: {
      type: "integer",
      example: 4,
      description: "Кількість потрібних кімнат",
    },
    teachersNeeded: {
      type: "integer",
      example: 5,
      description: "Кількість потрібних викладачів",
    },
  },
};

export default {
  paths: {
    "/schedules": {
      post: {
        tags: ["Schedules"],
        summary: "Згенерувати чернетку розкладу",
        description:
          "Розставляє гуртки для вибраних груп без накладок викладачів, груп і кімнат. " +
          "Старі заняття цих груп замінюються. Заняття, які не вдалося розставити, " +
          "повертаються в unscheduled.",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  groupIds: {
                    type: "array",
                    minItems: 1,
                    items: { type: "integer", minimum: 1 },
                    description:
                      "Для яких груп генерувати. Без поля: для всіх груп",
                    example: [1, 2],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Чернетка без запису в БД (saved = false)",
            content: { "application/json": { schema: scheduleResponse } },
          },
          201: {
            description: "Розклад збережено (saved = true)",
            content: { "application/json": { schema: scheduleResponse } },
          },
          400: errorResponse("Некоректні дані або помилка валідації"),
          404: errorResponse("Групу не знайдено"),
          409: errorResponse("Нові заняття накладаються на розклад інших груп"),
        },
      },
    },
    "/schedules/forecast": {
      get: {
        tags: ["Schedules"],
        summary: "Сформувати прогноз розкладу (чернетка без запису в БД)",
        description:
          "Формує прогнозований розклад на основі спрогнозованої кількості груп і дітей " +
          "без запису в базу даних (лише Admin). Враховує сон, харчування (FR-17, FR-18), " +
          "ліміт 2 заняття на день та усі 5 гуртків для кожної групи.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "groups",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, example: 4 },
            description:
              "Спрогнозована кількість груп (1–50). За замовчуванням = поточна кількість груп із БД.",
          },
          {
            in: "query",
            name: "children",
            required: false,
            schema: { type: "string", example: "15,12,18,14" },
            description:
              "Загальна кількість дітей (ціле невід'ємне число) або список по групах через кому (довжина = groups, до 20 дітей у групі).",
          },
        ],
        responses: {
          200: {
            description: "Прогнозована чернетка розкладу без запису в БД",
            content: {
              "application/json": { schema: forecastScheduleResponse },
            },
          },
          400: errorResponse("Некоректні параметри запиту"),
          401: errorResponse("Відсутній або невалідний токен"),
          403: errorResponse("Недостатньо прав (потрібна роль Admin)"),
        },
      },
    },
  },
};