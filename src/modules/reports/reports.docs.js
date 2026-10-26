export const reportsDocs = {
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
        200: { description: 'Успішне отримання даних прибутку' },
        404: { description: 'Групу не знайдено' },
      },
    },
  },
  '/reports/min-rooms': {
    get: {
      summary: 'Отримати мінімальну кількість кімнат для покриття постійних витрат',
      responses: {
        200: { description: 'Успішне розрахування мінімальної кількості кімнат' },
      },
    },
  },
};

export default reportsDocs;