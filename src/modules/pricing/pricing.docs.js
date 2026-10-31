export default {
    paths: {
        '/children/{id}/invoice': {
            get: {
                tags: ['Pricing'],
                summary: 'Отримати рахунок для дитини за період',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' },
                        description: 'ID дитини'
                    },
                    {
                        name: 'period',
                        in: 'query',
                        required: false,
                        schema: {
                            type: 'string',
                            enum: ['month', 'year'],
                            default: 'month'
                        },
                        description: 'Період нарахування (місяць або рік)'
                    }
                ],
                responses: {
                    200: {
                        description: 'Розрахований рахунок з деталізацією статей та знижок',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        period: { type: 'string', example: 'month' },
                                        months: { type: 'integer', example: 1 },
                                        items: {
                                            type: 'array',
                                            description: 'Статті без знижок: навчання і харчування (звіти відокремлюють харчування за name = meals)',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string', example: 'tuition' },
                                                    amount: { type: 'number', example: 15000 }
                                                }
                                            }
                                        },
                                        discounts: {
                                            type: 'object',
                                            description: 'У відповіді рахунку відсотки подані як частка (0.3 = 30%)',
                                            properties: {
                                                benefitType: { type: 'string', example: 'LEVEL_3' },
                                                benefitPercent: { type: 'number', example: 0.3 },
                                                yearlyPercent: { type: 'number', example: 0 },
                                                discountAmount: { type: 'number', example: 4500 }
                                            }
                                        },
                                        subtotal: { type: 'number', example: 26000 },
                                        total: { type: 'number', example: 21500 }
                                    }
                                }
                            }
                        }
                    },
                    400: { description: 'Некоректний період або невідомий benefitType' },
                    404: { description: 'Дитину не знайдено' },
                    409: { description: 'Вік дитини поза межами садка (2-5 років)' }
                }
            }
        },
        '/settings/prices': {
            get: {
                tags: ['Pricing'],
                summary: 'Отримати поточні тарифи та налаштування цін',
                responses: {
                    200: {
                        description: 'Поточні тарифи (навчання, харчування, знижки). Відсотки зберігаються як числа 0-100',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        tuitionMonthly: { type: 'number', example: 15000 },
                                        mealsPerDayByAge: {
                                            type: 'object',
                                            example: { '2': 300, '3': 400, '4': 500, '5': 600 }
                                        },
                                        benefitPercent: {
                                            type: 'object',
                                            example: { NONE: 0, LEVEL_1: 10, LEVEL_2: 20, LEVEL_3: 30 }
                                        },
                                        annualPaymentPercent: { type: 'number', example: 12 }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            put: {
                tags: ['Pricing'],
                summary: 'Оновити тарифи з фіксацією історії змін',
                description: 'Приймає лише ключі tuitionMonthly, mealsPerDayByAge, benefitPercent, annualPaymentPercent. Відсотки задаються числом 0-100. Невідомі ключі дають 400.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                additionalProperties: false,
                                properties: {
                                    tuitionMonthly: { type: 'number', minimum: 0, example: 16000 },
                                    mealsPerDayByAge: {
                                        type: 'object',
                                        description: 'Ключі: вік 2-5, значення: ціна харчування за день',
                                        example: { '2': 320, '3': 420 }
                                    },
                                    benefitPercent: {
                                        type: 'object',
                                        description: 'Ключі: NONE, LEVEL_1, LEVEL_2, LEVEL_3, значення 0-100',
                                        example: { LEVEL_1: 15 }
                                    },
                                    annualPaymentPercent: { type: 'number', minimum: 0, maximum: 100, example: 15 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Оновлені налаштування цін' },
                    400: { description: 'Помилка валідації вхідних даних (порожнє тіло, невідомий ключ, від\'ємні суми або відсотки поза 0..100)' }
                }
            }
        },
        '/settings/prices/history': {
            get: {
                tags: ['Pricing'],
                summary: 'Отримати історію змін цін (від нових до старих)',
                responses: {
                    200: {
                        description: 'Список історичних змін тарифів',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'integer' },
                                            changedAt: { type: 'string', format: 'date-time' },
                                            before: { type: 'object' },
                                            after: { type: 'object' }
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