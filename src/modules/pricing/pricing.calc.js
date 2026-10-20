import {
    DEFAULT_PRICES,
    ASSUMPTIONS,
    LIMITS
} from '../../config/constants.js';

/**
 * Допоміжна мапа для приведення назв пільг (підтримує обидва варіанти: min/medium/max та LEVEL_1/LEVEL_2/LEVEL_3)
 */
const BENEFIT_MAP = {
    none: 'NONE',
    min: 'LEVEL_1',
    medium: 'LEVEL_2',
    max: 'LEVEL_3',
    NONE: 'NONE',
    LEVEL_1: 'LEVEL_1',
    LEVEL_2: 'LEVEL_2',
    LEVEL_3: 'LEVEL_3'
};

/**
 * Розрахунок рахунку за контрактом ТЗ (розділ 4.2 та 4.4)
 * @param {Object} params
 * @param {number} params.age - вік дитини (2-5)
 * @param {string} [params.benefitType='none'] - пільга (none, min, medium, max)
 * @param {string} [params.period='month'] - період (month або year)
 * @param {Object} [prices=DEFAULT_PRICES] - об'єкт цін
 * @returns {Object}
 */
export function calcInvoice({ age, benefitType = 'none', period = 'month' }, prices = DEFAULT_PRICES) {
    const numericAge = Number(age);

    // 1. Перевірка віку за лімітами з констант
    if (
        Number.isNaN(numericAge) ||
        numericAge < LIMITS.CHILD_AGE_MIN ||
        numericAge > LIMITS.CHILD_AGE_MAX
    ) {
        throw new Error(`Недопустимий вік дитини: ${age}. Дозволено від ${LIMITS.CHILD_AGE_MIN} до ${LIMITS.CHILD_AGE_MAX} років.`);
    }

    // 2. Перевірка та визначення відсотка пільги
    const mappedKey = BENEFIT_MAP[benefitType];
    const rawBenefitPercent = prices.BENEFIT_PERCENT?.[mappedKey] ?? prices.benefitDiscounts?.[benefitType];

    if (rawBenefitPercent === undefined) {
        throw new Error(`Невідомий тип пільги: ${benefitType}`);
    }

    // Якщо відсоток заданий як ціле число (наприклад, 10, 20), переводимо в коефіцієнт (0.1, 0.2)
    const benefitDiscount = rawBenefitPercent > 1 ? rawBenefitPercent / 100 : rawBenefitPercent;

    // 3. Базове навчання на місяць (15 000)
    const tuitionPerMonth = prices.TUITION_MONTHLY ?? prices.tuitionPerMonth ?? 15000;

    // 4. Харчування на день за віком * 22 робочі дні
    const mealRates = prices.MEALS_PER_DAY_BY_AGE ?? prices.mealPerDayByAge;
    const dailyMealRate = mealRates?.[numericAge] ?? mealRates?.[String(numericAge)];

    if (!dailyMealRate) {
        throw new Error(`Не знайдено тариф харчування для віку ${numericAge}`);
    }

    const workingDays = ASSUMPTIONS.A1_WORKING_DAYS_PER_MONTH || 22;
    const mealsPerMonth = dailyMealRate * workingDays;

    // 5. Розрахунок періоду та річної знижки (12%)
    const isYear = period === 'year';
    const months = isYear ? 12 : 1;
    const rawYearlyPercent = prices.ANNUAL_PAYMENT_PERCENT ?? prices.yearlyDiscount ?? 12;
    const yearlyDiscount = isYear ? (rawYearlyPercent > 1 ? rawYearlyPercent / 100 : rawYearlyPercent) : 0;

    // 6. Суми без знижок
    const tuitionAmount = tuitionPerMonth * months;
    const mealsAmount = mealsPerMonth * months;
    const subtotal = tuitionAmount + mealsAmount;

    // 7. Множення знижок за ТЗ: (1 - пільга) * (1 - 0.12, якщо рік)
    const discountMultiplier = (1 - benefitDiscount) * (1 - yearlyDiscount);
    const total = Number((subtotal * discountMultiplier).toFixed(2));
    const discountAmount = Number((subtotal - total).toFixed(2));

    return {
        period,
        months,
        items: [
            { name: 'tuition', amount: tuitionAmount },
            { name: 'meals', amount: mealsAmount }
        ],
        discounts: {
            benefitType,
            benefitPercent: benefitDiscount,
            yearlyPercent: yearlyDiscount,
            discountAmount
        },
        subtotal,
        total
    };
}