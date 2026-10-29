import { pricingRepository } from './pricing.repository.js';
import { DEFAULT_PRICES, LIMITS } from '../../config/constants.js';
import { calcInvoice } from './pricing.calc.js';
import { childrenService } from '../children/children.service.js';
import { ConflictError } from '../../lib/errors.js';

export const pricingService = {
    // GET /children/:id/invoice
    async getChildInvoice(childId, period = 'month') {
        // 1. Дитина (якщо немає, сервіс викине 404)
        const child = await childrenService.getById(childId);

        // 2. Перевірка віку (2-5 років за ТЗ)
        const age = child.age;
        if (age < (LIMITS?.CHILD_AGE_MIN ?? 2) || age > (LIMITS?.CHILD_AGE_MAX ?? 5)) {
            throw new ConflictError(`Вік дитини (${age}) поза межами садка (дозволено 2-5 років)`);
        }

        // 3. Актуальні ціни з БД
        const prices = await this.getCurrentPrices();

        // 4. Мапінг пільг ('max'/'medium'/'min' та 'LEVEL_1'/'LEVEL_2'/'LEVEL_3')
        const rawBenefit = (child.benefitType || 'none').toLowerCase();

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

        // 5. Чиста функція розрахунку
        return calcInvoice({ age, benefitType, period }, prices);
    },

    async getCurrentPrices() {
        let settings = await pricingRepository.getSettings();
        if (!settings) {
            settings = await pricingRepository.createSettings(DEFAULT_PRICES);
        }
        // Доповнюємо дефолтами: рахунок не ламається, якщо в базі немає якогось ключа
        const data = settings.data || {};
        return {
            ...DEFAULT_PRICES,
            ...data,
            mealsPerDayByAge: { ...DEFAULT_PRICES.mealsPerDayByAge, ...(data.mealsPerDayByAge || {}) },
            benefitPercent: { ...DEFAULT_PRICES.benefitPercent, ...(data.benefitPercent || {}) }
        };
    },

    async updatePrices(patchData) {
        let settings = await pricingRepository.getSettings();
        if (!settings) {
            settings = await pricingRepository.createSettings(DEFAULT_PRICES);
        }

        const oldPrices = settings.data || {};

        // Вкладені об'єкти зливаються по ключах, решта полів замінюється
        const newPrices = {
            ...DEFAULT_PRICES,
            ...oldPrices,
            ...patchData,
            mealsPerDayByAge: {
                ...DEFAULT_PRICES.mealsPerDayByAge,
                ...(oldPrices.mealsPerDayByAge || {}),
                ...(patchData.mealsPerDayByAge || {})
            },
            benefitPercent: {
                ...DEFAULT_PRICES.benefitPercent,
                ...(oldPrices.benefitPercent || {}),
                ...(patchData.benefitPercent || {})
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