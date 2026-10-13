// Чисті функції: беруть числа, повертають число.
// Жодної бази і жодного Express.

// Прибуток = виручка мінус усі витрати
function calcProfit(revenue, costs) {
const totalCosts = costs.room + costs.salaries + costs.bonuses + costs.food;
return revenue - totalCosts;
}

// Прибуток однієї групи, де n дітей.
// p це об'єкт із цінами й правилами.
function calcGroupProfit(n, p) {
  const extra = Math.max(0, n - p.bonusFrom); // діти понад 12-ту
  const revenue = n * p.pricePerChild;
return calcProfit(revenue, {
    room: p.room,
    salaries: p.educator + p.assistant,
    bonuses: extra * (p.educatorBonus + p.assistantBonus),
    food: n * p.foodCostPerChild,
});
}

// Найменша кількість дітей, при якій прибуток не менший за нуль.
// Якщо навіть у повній групі мінус, повертає null.
function minChildrenToBreakEven(p) {
for (let n = 1; n <= p.maxChildren; n++) {
    if (calcGroupProfit(n, p) >= 0) return n;
}
return null;
}

module.exports = { calcProfit, calcGroupProfit, minChildrenToBreakEven };