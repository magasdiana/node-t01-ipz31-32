const money = { type: 'number' };

const profitExpensesSchema = {
  type: 'object',
  properties: {
    rooms: money,
    salaries: money,
    allowances: money,
    meals: money,
  },
};

const profitProperties = {
  tuitionRevenue: money,
  mealsRevenue: money,
  revenue: money,
  expenses: profitExpensesSchema,
  totalExpenses: money,
  profit: money,
};

const groupProfitSchema = {
  type: 'object',
  properties: {
    groupId: { type: 'integer' },
    name: { type: 'string', nullable: true },
    children: { type: 'integer' },
    ...profitProperties,
  },
};

const profitSchema = {
  type: 'object',
  properties: {
    month: {
      type: 'string',
      example: '2026-10',
    },

    groupId: { type: 'integer' },

    name: {
      type: 'string',
      nullable: true,
    },

    children: { type: 'integer' },

    ...profitProperties,

    shared: {
      type: 'object',
      nullable: true,
      properties: {
        manager: money,
        teachers: money,
        total: money,
      },
    },

    groups: {
      type: 'array',
      items: groupProfitSchema,
    },
  },
};

const minRoomsSchema = {
  type: 'object',
  properties: {
    rooms: {
      type: 'integer',
      nullable: true,
      example: 8,
    },

    margin: {
      type: 'number',
      example: 91000,
    },

    reason: {
      type: 'string',
      nullable: true,
    },

    model: {
      type: 'object',
      properties: {
        childrenPerRoom: {
          type: 'integer',
          example: 20,
        },

        netRevenuePerChild: {
          type: 'number',
          example: 15000,
        },

        perRoomCost: {
          type: 'number',
          example: 130000,
        },

        roomCostPerRoom: {
          type: 'number',
          example: 50000,
        },

        educatorSalary: {
          type: 'number',
          example: 40000,
        },

        assistantSalary: {
          type: 'number',
          example: 40000,
        },

        fixedCosts: {
          type: 'number',
          example: 680000,
        },
      },
    },
  },
};

const financialResultSchema = {
  type: 'object',
  properties: {
    revenue: money,
    costs: money,
    profit: money,
  },
};

const forecastSchema = {
  type: 'object',
  properties: {
    scenario: {
      type: 'object',
      properties: {
        groups: {
          type: 'integer',
          example: 3,
        },

        children: {
          type: 'array',
          items: {
            type: 'integer',
            minimum: 0,
            maximum: 20,
          },
          example: [15, 12, 18],
        },

        months: {
          type: 'integer',
          example: 3,
        },
      },
    },

    months: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          month: { type: 'integer' },
          ...financialResultSchema.properties,
        },
      },
    },

    total: financialResultSchema,

    optimum: {
      type: 'object',
      properties: {
        maxProfit: {
          type: 'number',
          nullable: true,
        },

        bestRooms: {
          type: 'integer',
          nullable: true,
        },

        bestChildren: {
          type: 'integer',
          nullable: true,
        },

        plateauRooms: {
          type: 'integer',
          nullable: true,
          description:
            'Перша кількість кімнат, після якої прибуток не зростає',
        },

        table: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rooms: { type: 'integer' },
              children: { type: 'integer' },
              profit: money,
            },
          },
        },

        note: {
          type: 'string',
          nullable: true,
        },
      },
    },

    breakdown: {
      type: 'object',
      properties: {
        tuitionRevenue: money,
        mealsRevenue: money,

        expenses: {
          type: 'object',
          properties: {
            fixed: money,
            rooms: money,
            salaries: money,
            allowances: money,
            meals: money,
          },
        },
      },
    },
  },
};

const authResponses = {
  401: {
    description: 'Відсутній або недійсний JWT-токен',
  },

  403: {
    description: 'Доступ дозволено лише користувачам із роллю Admin',
  },
};

export const reportsDocs = {
  '/reports/forecast-profit': {
    get: {
      tags: ['Reports'],

      summary: 'Сценарний прогноз прибутку без запису в БД',

      description:
        'Доступ лише для Admin. ' +
        'За відсутності groups і children використовуються поточні дані БД. ' +
        'Якщо children задано одним числом, діти розподіляються рівномірно. ' +
        'Якщо children задано списком, його довжина має дорівнювати кількості груп. ' +
        'Максимальна місткість групи — 20 дітей. ' +
        'Для дітей без профілю використовується вік 3 роки та відсутність пільги. ' +
        'Використовуються актуальні налаштування вартості навчання, харчування та пільг. ' +
        'Харчування є транзитним: дохід дорівнює витратам. ' +
        'Прогноз містить максимальний прибуток і точку плато відповідно до FR-32.',

      parameters: [
        {
          name: 'groups',
          in: 'query',
          required: false,

          description:
            'Кількість груп. За замовчуванням — поточна кількість груп у БД.',

          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            example: 3,
          },
        },

        {
          name: 'children',
          in: 'query',
          required: false,

          description:
            'Загальна кількість дітей, наприклад 45, ' +
            'або розподіл по групах, наприклад 15,12,18. ' +
            'Допустима кількість дітей у кожній групі — від 0 до 20.',

          schema: {
            type: 'string',
            pattern: '^\\d+(,\\d+)*$',
            example: '15,12,18',
          },
        },

        {
          name: 'months',
          in: 'query',
          required: false,

          description: 'Кількість місяців прогнозування.',

          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 12,
            default: 3,
          },
        },
      ],

      responses: {
        200: {
          description: 'Успішне формування прогнозу',

          content: {
            'application/json': {
              schema: forecastSchema,
            },
          },
        },

        400: {
          description:
            'Некоректні параметри, неправильний розподіл дітей або перевищення місткості груп',
        },

        ...authResponses,
      },
    },
  },

  '/reports/profit': {
    get: {
      tags: ['Reports'],

      summary: 'Отримати загальний прибуток та прибуток по групах',

      description:
        'Доступ лише для Admin. ' +
        'Повертає фактичні доходи, витрати та прибуток за вибраний місяць. ' +
        'За відсутності month використовується поточний місяць. ' +
        'За наявності groupId повертається звіт конкретної групи без загальних витрат садка. ' +
        'Витрати на харчування включаються до totalExpenses.',

      parameters: [
        {
          name: 'month',
          in: 'query',
          required: false,

          description: 'Звітний місяць у форматі YYYY-MM.',

          schema: {
            type: 'string',
            pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
            example: '2026-10',
          },
        },

        {
          name: 'groupId',
          in: 'query',
          required: false,

          description: 'ID конкретної групи для фільтрації звіту.',

          schema: {
            type: 'integer',
            minimum: 1,
          },
        },
      ],

      responses: {
        200: {
          description: 'Успішне отримання фінансового звіту',

          content: {
            'application/json': {
              schema: profitSchema,
            },
          },
        },

        400: {
          description: 'Некоректний month або groupId',
        },

        ...authResponses,

        404: {
          description: 'Групу з указаним ID не знайдено',
        },
      },
    },
  },

  '/reports/min-rooms': {
    get: {
      tags: ['Reports'],

      summary:
        'Отримати мінімальну кількість кімнат для покриття постійних витрат',

      description:
        'Доступ лише для Admin. ' +
        'Розрахунок виконується за базовою BA-моделлю: ' +
        '20 дітей у групі, навчання 15000 грн на дитину, ' +
        'оренда кімнати 50000 грн, зарплати вихователя та асистента по 40000 грн, ' +
        'бонуси відповідно до кількості дітей. ' +
        'Постійні витрати становлять 680000 грн на місяць. ' +
        'Контрольний результат — 8 кімнат та маржа 91000 грн на групу.',

      responses: {
        200: {
          description:
            'Успішне розрахування мінімальної кількості кімнат',

          content: {
            'application/json': {
              schema: minRoomsSchema,
            },
          },
        },

        ...authResponses,
      },
    },
  },
};

export default {
  paths: reportsDocs,
};