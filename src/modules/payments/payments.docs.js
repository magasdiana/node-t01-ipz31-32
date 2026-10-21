export default {
    paths: {
        '/payments': {
            post: {
                tags: ['Payments'],
                summary: 'Створити платіж для дитини (сума рахується сервером автоматично)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['childId'],
                                properties: {
                                    childId: { type: 'integer', example: 1 },
                                    period: {
                                        type: 'string',
                                        enum: ['month', 'year'],
                                        default: 'month',
                                        example: 'month'
                                    },
                                    periodStart: {
                                        type: 'string',
                                        pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
                                        example: '2026-10',
                                        description: 'Місяць початку періоду (за замовчуванням місяць дати оплати)'
                                    },
                                    date: {
                                        type: 'string',
                                        format: 'date-time',
                                        description: 'Дата платежу в ISO форматі (за замовчуванням поточний час)'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: 'Платіж успішно зафіксовано',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'integer', example: 1 },
                                        childId: { type: 'integer', example: 1 },
                                        amount: { type: 'number', example: 15120 },
                                        discounts: { type: 'object' },
                                        period: { type: 'string', example: 'month' },
                                        periodStart: { type: 'string', example: '2026-10' },
                                        date: { type: 'string', example: '2026-10-21T09:20:00.000Z' }
                                    }
                                }
                            }
                        }
                    },
                    400: { description: 'Помилка валідації вхідних даних або періоду' },
                    404: { description: 'Дитину не знайдено' },
                    409: { description: 'Вік дитини поза діапазоном 2-5 років' }
                }
            },
            get: {
                tags: ['Payments'],
                summary: 'Отримати історію платежів (опціонально за childId)',
                parameters: [
                    {
                        name: 'childId',
                        in: 'query',
                        required: false,
                        schema: { type: 'integer' },
                        description: 'Фільтрація оплат за ID конкретної дитини'
                    }
                ],
                responses: {
                    200: {
                        description: 'Список зафіксованих платежів',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'integer' },
                                            childId: { type: 'integer' },
                                            amount: { type: 'number' },
                                            discounts: { type: 'object' },
                                            period: { type: 'string' },
                                            periodStart: { type: 'string' },
                                            date: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};