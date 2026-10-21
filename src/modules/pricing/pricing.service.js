import { pricingRepository } from './pricing.repository.js';
import { DEFAULT_PRICES, LIMITS } from '../../config/constants.js';
import { calcInvoice } from './pricing.calc.js';
import { childrenService } from '../children/children.service.js';
import { BadRequestError, ConflictError } from '../../lib/errors.js';

export const pricingService = {
    // GET /children/:id/invoice
    async getChildInvoice(childId, period = 'month') {
        // 1. Валідація періоду
        if (period !== 'month' && period !== 'year') {
            throw new BadRequestError("Невідомий період. Дозволено лише 'month' або 'year'");
        }

        const id = Number(childId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new BadRequestError("id має бути додатним цілим числом");
        }

        // 2. Отримуємо дитину через childrenService (якщо немає — викине 404)
        const child = await childrenService.getById(id);

        // 3. Перевірка віку (2-5 років за ТЗ)
        const age = child.age;
        if (age < (LIMITS?.CHILD_AGE_MIN ?? 2) || age > (LIMITS?.CHILD_AGE_MAX ?? 5)) {
            throw new ConflictError(`Вік дитини (${age}) поза межами садка (дозволено 2-5 років)`);
        }

        // 4. Отримуємо актуальні ціни з БД
        const prices = await this.getCurrentPrices();

        // 5. Мапінг пільг (підтримуємо обидва формати: 'max'/'medium'/'min' та 'LEVEL_1'/'LEVEL_2'/'LEVEL_3')
        let rawBenefit = (child.benefitType || 'none').toLowerCase();

        // Словник переведення для calcInvoice
        const benefitMap = {
            none: 'NONE',
            min: 'LEVEL_1',
            medium: 'LEVEL_2',
            max: 'LEVEL_3',
            level_1: 'LEVEL_1',
            level_2: 'LEVEL_2',
            level_3: 'LEVEL_3'
        };

        const benefitType = benefitMap[rawBenefit] || rawBenefit;

        // 6. Викликаємо чисту функцію розрахунку
        return calcInvoice({ age, benefitType, period }, prices);
    },

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

        const newPrices = {
            ...oldPrices,
            ...patchData,
            mealsPerDayByAge: {
                ...(oldPrices.mealsPerDayByAge || oldPrices.mealPerDayByAge),
                ...(patchData.mealsPerDayByAge || patchData.mealPerDayByAge || {})
            },
            benefitPercent: {
                ...(oldPrices.benefitPercent || oldPrices.benefitDiscounts),
                ...(patchData.benefitPercent || patchData.benefitDiscounts || {})
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