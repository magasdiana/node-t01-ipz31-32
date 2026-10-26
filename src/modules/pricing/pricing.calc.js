import {
    DEFAULT_PRICES,
    ASSUMPTIONS,
    LIMITS
} from '../../config/constants.js';

/**
 * Допоміжна мапа для приведення назв пільг
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

export function calcInvoice({ age, benefitType = 'none', period = 'month' }, prices = DEFAULT_PRICES) {
    const numericAge = Number(age);

    // 1. Перевірка віку
    const minAge = LIMITS?.CHILD_AGE_MIN ?? 2;
    const maxAge = LIMITS?.CHILD_AGE_MAX ?? 5;
    if (
        Number.isNaN(numericAge) ||
        numericAge < minAge ||
        numericAge > maxAge
    ) {
        throw new Error(`Недопустимий вік дитини: ${age}. Дозволено від ${minAge} до ${maxAge} років.`);
    }

    // 2. Перевірка та визначення відсотка пільги (шукаємо у всіх можливих варіантах ключів)
    const mappedKey = BENEFIT_MAP[benefitType] || benefitType;
    const benefitDict = prices.benefitPercent || prices.BENEFIT_PERCENT || prices.benefitDiscounts || {};

    const rawBenefitPercent = benefitDict[mappedKey]
        ?? benefitDict[benefitType]
        ?? benefitDict[String(benefitType).toLowerCase()]
        ?? benefitDict[String(mappedKey).toLowerCase()];

    if (rawBenefitPercent === undefined) {
        throw new Error(`Невідомий тип пільги: ${benefitType}`);
    }

    const benefitDiscount = rawBenefitPercent > 1 ? rawBenefitPercent / 100 : rawBenefitPercent;

    // 3. Базове навчання на місяць (15 000)
    const tuitionPerMonth = prices.tuitionMonthly ?? prices.TUITION_MONTHLY ?? prices.tuitionPerMonth ?? 15000;

    // 4. Харчування на день за віком * 22 робочі дні
    const mealRates = prices.mealsPerDayByAge ?? prices.MEALS_PER_DAY_BY_AGE ?? prices.mealPerDayByAge ?? {};
    const dailyMealRate = mealRates[numericAge] ?? mealRates[String(numericAge)];

    if (!dailyMealRate) {
        throw new Error(`Не знайдено тариф харчування для віку ${numericAge}`);
    }

    const workingDays = ASSUMPTIONS?.A1_WORKING_DAYS_PER_MONTH ?? 22;
    const mealsPerMonth = dailyMealRate * workingDays;

    // 5. Розрахунок періоду та річної знижки (12%)
    const isYear = period === 'year';
    const months = isYear ? 12 : 1;
    const rawYearlyPercent = prices.annualPaymentPercent ?? prices.ANNUAL_PAYMENT_PERCENT ?? prices.yearlyDiscount ?? 12;
    const yearlyDiscount = isYear ? (rawYearlyPercent > 1 ? rawYearlyPercent / 100 : rawYearlyPercent) : 0;

    // 6. Суми без знижок
    const tuitionAmount = tuitionPerMonth * months;
    const mealsAmount = mealsPerMonth * months;
    const subtotal = tuitionAmount + mealsAmount;

    // 7. Знижки діють ТІЛЬКИ на навчання (харчування без знижок):
    const discountMultiplier = (1 - benefitDiscount) * (1 - yearlyDiscount);
    const tuitionDiscounted = Number((tuitionAmount * discountMultiplier).toFixed(2));
    const discountAmount = Number((tuitionAmount - tuitionDiscounted).toFixed(2));

    // Разом: навчання зі знижкою + повна вартість харчування
    const total = Number((tuitionDiscounted + mealsAmount).toFixed(2));

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