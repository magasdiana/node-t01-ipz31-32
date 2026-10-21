import { paymentsRepository } from './payments.repository.js';
import { pricingService } from '../pricing/pricing.service.js';

export const paymentsService = {
    // POST /payments
    async createPayment({ childId, period = 'month', periodStart, date }) {
        // 1. Дата оплати (ISO)
        const paymentDate = date ? new Date(date).toISOString() : new Date().toISOString();

        // 2. periodStart за замовчуванням YYYY-MM від paymentDate
        const currentYearMonth = paymentDate.slice(0, 7);
        const resolvedPeriodStart = periodStart || currentYearMonth;

        // 3. Сервер САМ рахує чек через getChildInvoice
        // Якщо дитини немає — сервіс автоматично викине NotFoundError (404)
        const invoice = await pricingService.getChildInvoice(childId, period);

        // 4. Формуємо знімок згідно з NFR-04
        const paymentSnapshot = {
            amount: invoice.total,
            discounts: invoice.discounts,
            period,
            periodStart: resolvedPeriodStart,
            date: paymentDate
        };

        // 5. Зберігаємо в базі
        const record = await paymentsRepository.create(childId, paymentSnapshot);

        return {
            id: record.id,
            childId: record.childId,
            ...record.data
        };
    },

    // GET /payments?childId=
    async getPayments(childId) {
        const where = {};
        if (childId) {
            where.childId = Number(childId);
        }

        const records = await paymentsRepository.findMany(where);

        return records.map((record) => ({
            id: record.id,
            childId: record.childId,
            ...record.data
        }));
    }
};