import { prisma } from '../../lib/prisma.js';

export const paymentsRepository = {
    // Створити запис оплати
    async create(childId, paymentSnapshot) {
        return prisma.payment.create({
            data: {
                childId,
                data: paymentSnapshot
            }
        });
    },

    // Отримати оплати (з можливістю фільтрації за childId)
    async findMany(where = {}) {
        return prisma.payment.findMany({
            where,
            orderBy: { id: 'desc' }
        });
    }
};