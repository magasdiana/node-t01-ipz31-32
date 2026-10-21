import { pricingRepository } from './pricing.repository.js';
import { DEFAULT_PRICES } from '../../config/constants.js';

export const pricingService = {
    async getCurrentPrices() {
        let settings = await pricingRepository.getSettings();
        if (!settings) {
            settings = await pricingRepository.createSettings(DEFAULT_PRICES);
        }
        return settings.data;
    },

    async updatePrices(patchData) {
        let settings = await pricingRepository.getSettings();
        if (!settings) {
            settings = await pricingRepository.createSettings(DEFAULT_PRICES);
        }

        const oldPrices = settings.data;

        // Зливаємо старі та нові ціни
        const newPrices = {
            ...oldPrices,
            ...patchData,
            mealPerDayByAge: {
                ...oldPrices.mealPerDayByAge,
                ...(patchData.mealPerDayByAge || {})
            },
            benefitDiscounts: {
                ...oldPrices.benefitDiscounts,
                ...(patchData.benefitDiscounts || {})
            }
        };

        await pricingRepository.updateSettingsWithHistory(settings.id, newPrices, oldPrices);
        return newPrices;
    },

    async getPriceHistory() {
        const history = await pricingRepository.getHistory();
        return history.map((record) => ({
            id: record.id,
            changedAt: record.data?.changedAt,
            before: record.data?.before,
            after: record.data?.after
        }));
    }
};