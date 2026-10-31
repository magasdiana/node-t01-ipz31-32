import { z } from 'zod';
import { idParam } from '../../lib/schemas.js';

// 1. Схема валідації для GET /children/:id/invoice?period=month|year
export const getInvoiceValidation = z.object({
    body: z.object({}).optional(),
    params: idParam,
    query: z.object({
        period: z.enum(['month', 'year']).default('month')
    })
});

const BENEFIT_KEYS = ['NONE', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

// 2. Тіло PUT /settings/prices. Єдині ключі цін; відсотки задаються числом 0-100.
// strict(): невідомий ключ (наприклад, старий tuitionPerMonth) дає 400, а не мовчазний 200.
export const updatePricesBodySchema = z.object({
    tuitionMonthly: z.number().nonnegative().optional(),
    mealsPerDayByAge: z
        .record(z.string(), z.number().nonnegative())
        .refine((o) => Object.keys(o).every((k) => /^[2-5]$/.test(k)), {
            message: 'Вік має бути від 2 до 5'
        })
        .optional(),
    benefitPercent: z
        .record(z.string(), z.number().min(0).max(100))
        .refine((o) => Object.keys(o).every((k) => BENEFIT_KEYS.includes(k)), {
            message: 'Невідомий рівень пільги'
        })
        .optional(),
    annualPaymentPercent: z.number().min(0).max(100).optional()
}).strict().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Body cannot be empty' }
);

// 3. Обгортка за шаблоном для middleware validate
export const updatePricesSchema = z.object({
    body: updatePricesBodySchema,
    params: z.object({}).optional(),
    query: z.object({}).optional()
});