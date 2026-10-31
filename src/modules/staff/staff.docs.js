const jsonObject = { 'application/json': { schema: { type: 'object' } } };

const staffBody = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'Викладач Петро' },
    position: {
      type: 'string',
      enum: ['teacher', 'caregiver', 'educator', 'assistant', 'admin', 'manager'],
    },
    salary: { type: 'number', example: 40000 },
    allowance: { type: 'number', example: 0 },
    groupId: { type: 'integer', nullable: true, example: 2 },
    subjectIds: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
  },
};

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };

export default {
  paths: {
    '/staff': {
      get: {
        tags: ['Staff'],
        summary: 'Отримати список співробітників',
        responses: {
          200: { description: 'Список співробітників', content: { 'application/json': { schema: { type: 'array', items: { type: 'object' } } } } },
        },
      },
      post: {
        tags: ['Staff'],
        summary: 'Створити нового співробітника',
        requestBody: { required: true, content: { 'application/json': { schema: staffBody } } },
        responses: {
          201: { description: 'Співробітника створено', content: jsonObject },
          400: { description: 'Некоректні дані', content: jsonObject },
        },
      },
    },

    '/staff/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Staff'],
        summary: 'Отримати співробітника за ID',
        responses: {
          200: { description: 'Дані співробітника', content: jsonObject },
          400: { description: 'Некоректний id', content: jsonObject },
          404: { description: 'Співробітника не знайдено', content: jsonObject },
        },
      },
      patch: {
        tags: ['Staff'],
        summary: 'Оновити співробітника за ID',
        requestBody: { required: true, content: { 'application/json': { schema: staffBody } } },
        responses: {
          200: { description: 'Співробітника оновлено', content: jsonObject },
          400: { description: 'Некоректні дані', content: jsonObject },
          404: { description: 'Співробітника не знайдено', content: jsonObject },
        },
      },
    },

    '/staff/{id}/schedule': {
      get: {
        tags: ['Staff'],
        summary: 'Розклад викладача',
        description: 'Заняття співробітника з усіх груп, відсортовані за днем і часом (FR-22).',
        parameters: [idParam],
        responses: {
          200: {
            description: 'Розклад викладача',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    staffId: { type: 'integer', example: 10 },
                    fullName: { type: 'string', example: 'Викладач Музика 1' },
                    lessons: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          groupId: { type: 'integer' },
                          subjectId: { type: 'integer' },
                          subjectName: { type: 'string', nullable: true, example: 'Музика' },
                          day: { type: 'integer', minimum: 1, maximum: 5, description: '1 = понеділок' },
                          start: { type: 'string', example: '09:00' },
                          duration: { type: 'integer', example: 30 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Некоректний id', content: jsonObject },
          404: { description: 'Співробітника не знайдено', content: jsonObject },
        },
      },
    },
  },
};