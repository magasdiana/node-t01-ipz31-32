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

// 2. Схема тіла для PUT /settings/prices (з перевіркою на непорожнє тіло)
export const updatePricesBodySchema = z.object({
    tuitionPerMonth: z.number().nonnegative().optional(),
    mealPerDayByAge: z.record(z.string(), z.number().nonnegative()).optional(),
    benefitDiscounts: z.record(z.string(), z.number().min(0).max(1)).optional(),
    yearlyDiscount: z.number().min(0).max(1).optional()
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Body cannot be empty' }
);

// 3. Обгортка за узгодженим шаблоном для middleware validate
export const updatePricesSchema = z.object({
    body: updatePricesBodySchema,
    params: z.object({}).optional(),
    query: z.object({}).optional()
});