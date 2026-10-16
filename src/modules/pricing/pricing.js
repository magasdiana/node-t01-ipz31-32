const { PRICES, BENEFIT_DISCOUNTS, DISCOUNT_YEAR } = require('../../config/constants');

/**
 * Вартість базового навчання для дитини
 * @param {Object} child
 * @returns {number}
 */
function calcTuition(child) {
    return PRICES.baseTuition;
}

/**
 * Вартість харчування за віком на день/період
 * @param {number} age - вік дитини
 * @param {number} [days=20] - кількість днів
 * @returns {number}
 */
function calcMeals(age, days = 20) {
    let dailyRate = PRICES.meals.senior;

    if (age <= 3) {
        dailyRate = PRICES.meals.toddler;
    } else if (age === 4) {
        dailyRate = PRICES.meals.junior;
    }

    return dailyRate * days;
}

/**
 * Розрахунок з урахуванням пільги
 * @param {number} amount
 * @param {string} benefitType
 * @returns {number}
 */
function applyBenefit(amount, benefitType) {
    const discountRate = BENEFIT_DISCOUNTS[benefitType] || 0;
    return amount * (1 - discountRate);
}

/**
 * Знижка 12% при оплаті за весь рік
 * @param {number} amount
 * @param {boolean} paidForYear
 * @returns {number}
 */
function applyYearDiscount(amount, paidForYear) {
    if (!paidForYear) {
        return amount;
    }
    return amount * (1 - DISCOUNT_YEAR);
}

module.exports = {
    calcTuition,
    calcMeals,
    applyBenefit,
    applyYearDiscount
};