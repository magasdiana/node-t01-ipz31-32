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
                                            properties: {
                                                benefitType: { type: 'string', example: 'LEVEL_3' },
                                                benefitPercent: { type: 'number', example: 0.3 },
                                                yearlyPercent: { type: 'number', example: 0 },
                                                discountAmount: { type: 'number', example: 6480 }
                                            }
                                        },
                                        subtotal: { type: 'number', example: 21600 },
                                        total: { type: 'number', example: 15120 }
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
                        description: 'Поточні тарифи (навчання, харчування, знижки)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        tuitionMonthly: { type: 'number', example: 15000 },
                                        mealsPerDayByAge: {
                                            type: 'object',
                                            example: { '2': 300, '3': 300, '4': 320, '5': 320 }
                                        },
                                        benefitPercent: {
                                            type: 'object',
                                            example: { NONE: 0, LEVEL_1: 0.1, LEVEL_2: 0.2, LEVEL_3: 0.3 }
                                        },
                                        annualPaymentPercent: { type: 'number', example: 0.12 }
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
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    tuitionMonthly: { type: 'number', minimum: 0, example: 16000 },
                                    mealsPerDayByAge: {
                                        type: 'object',
                                        example: { '2': 320, '3': 320 }
                                    },
                                    benefitPercent: {
                                        type: 'object',
                                        example: { LEVEL_1: 0.15 }
                                    },
                                    annualPaymentPercent: { type: 'number', minimum: 0, maximum: 1, example: 0.15 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Оновлені налаштування цін' },
                    400: { description: 'Помилка валідації вхідних даних (від\'ємні суми або відсотки поза 0..1)' }
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