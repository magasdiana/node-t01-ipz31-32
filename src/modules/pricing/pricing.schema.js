import { z } from 'zod';

export const updatePricesSchema = z.object({
    tuitionPerMonth: z.number().nonnegative().optional(),
    mealPerDayByAge: z.record(z.string(), z.number().nonnegative()).optional(),
    benefitDiscounts: z.record(z.string(), z.number().min(0).max(1)).optional(),
    yearlyDiscount: z.number().min(0).max(1).optional()
});