import { prisma } from '../../lib/prisma.js';

export const pricingRepository = {
    // Отримати поточний запис цін
    async getSettings() {
        return prisma.priceSettings.findFirst();
    },

    // Створити початковий запис цін
    async createSettings(data) {
        return prisma.priceSettings.create({
            data: { data }
        });
    },

    // Оновити ціни та зберегти знімок в історію в одній транзакції
    async updateSettingsWithHistory(settingId, newPrices, oldPrices) {
        return prisma.$transaction(async (tx) => {
            const updated = await tx.priceSettings.update({
                where: { id: settingId },
                data: { data: newPrices }
            });

            await tx.priceHistory.create({
                data: {
                    data: {
                        changedAt: new Date().toISOString(),
                        before: oldPrices,
                        after: newPrices
                    }
                }
            });

            return updated;
        });
    },

    // Отримати всю історію змін від нових до старих
    async getHistory() {
        return prisma.priceHistory.findMany({
            orderBy: { id: 'desc' }
        });
    }
};