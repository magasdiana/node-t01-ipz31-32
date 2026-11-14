export const reportsDocs = {
  '/reports/forecast-profit': {
    get: {
      summary: 'Сценарний прогноз прибутку без запису в БД',
      description:
        'Прогноз для адміністратора. За відсутності groups/children ' +
        'використовуються поточні кількості з БД. ' +
        'Для нових дітей без профілю: вік 3 роки, пільга none. ' +
        'Харчування — транзит: однакова виручка і витрати.',
      parameters: [
        {
          name: 'groups',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
          },
        },
        {
          name: 'children',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            example: '15,12,18',
          },
          description: 'Загальна кількість або розподіл по групах',
        },
        {
          name: 'months',
          in: 'query',
          required: false,
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
          description:
            'months, total, optimum, breakdown',
        },
        400: {
          description:
            'Некоректні параметри або перевищено місткість груп',
        },
        401: {
          description: 'Потрібна авторизація',
        },
        403: {
          description: 'Доступ лише для Admin',
        },
      },
    },
  },

  '/reports/profit': {
    get: {
      summary: 'Отримати загальний прибуток та прибуток по групах',
      parameters: [
        {
          name: 'groupId',
          in: 'query',
          required: false,
          schema: { type: 'integer' },
          description: 'Фільтрація прибутку за ID конкретної групи',
        },
      ],
      responses: {
        200: {
          description: 'Успішне отримання даних прибутку',
        },
        404: {
          description: 'Групу не знайдено',
        },
      },
    },
  },

  '/reports/min-rooms': {
    get: {
      summary:
        'Отримати мінімальну кількість кімнат для покриття постійних витрат',
      responses: {
        200: {
          description: 'Успішне розрахування мінімальної кількості кімнат',
        },
      },
    },
  },
};

export default reportsDocs;