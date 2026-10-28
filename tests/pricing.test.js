import test from 'node:test';
import assert from 'node:assert/strict';
import { calcInvoice } from '../src/modules/pricing/pricing.calc.js';

test('Dev 3: Тести розрахунку рахунку (FR-23...FR-28)', async (t) => {
    // --- 1. Контрольні приклади ---
    await t.test('Приклад 1: Вік 2, без пільги, місяць = 21 600', () => {
        // 15 000 + 300 * 22 = 21 600
        const res = calcInvoice({ age: 2, benefitType: 'none', period: 'month' });
        assert.equal(res.total, 21600);
        assert.equal(res.subtotal, 21600);
        assert.equal(res.months, 1);
        assert.equal(res.items.length, 2);
        assert.deepEqual(res.items, [
            { name: 'tuition', amount: 15000 },
            { name: 'meals', amount: 6600 }
        ]);
    });

    await t.test('Приклад 2: Вік 4, пільга 20% (medium), місяць = 23 000', () => {
        // Навчання: 15 000 * 0.8 = 12 000 (знижка 3 000)
        // Харчування: 500 * 22 = 11 000
        // Разом: 12 000 + 11 000 = 23 000
        const res = calcInvoice({ age: 4, benefitType: 'medium', period: 'month' });
        assert.equal(res.total, 23000);
        assert.equal(res.subtotal, 26000);
        assert.equal(res.discounts.benefitPercent, 0.2);
        assert.equal(res.discounts.discountAmount, 3000);
        assert.equal(res.items.length, 2);
    });

    await t.test('Приклад 3: Вік 4, пільга 20% (medium), рік = 258 720', () => {
        // Навчання за рік: 180 000 * 0.8 * 0.88 = 126 720 (знижка 53 280)
        // Харчування за рік: 500 * 22 * 12 = 132 000
        // Разом: 126 720 + 132 000 = 258 720
        const res = calcInvoice({ age: 4, benefitType: 'medium', period: 'year' });
        assert.equal(res.total, 258720);
        assert.equal(res.subtotal, 312000);
        assert.equal(res.months, 12);
        assert.equal(res.discounts.yearlyPercent, 0.12);
        assert.equal(res.discounts.discountAmount, 53280);
    });

    await t.test('Приклад 4: Вік 5, пільга 30% (max), рік = 269 280', () => {
        // Навчання за рік: 180 000 * 0.7 * 0.88 = 110 880 (знижка 69 120)
        // Харчування за рік: 600 * 22 * 12 = 158 400
        // Разом: 110 880 + 158 400 = 269 280
        const res = calcInvoice({ age: 5, benefitType: 'max', period: 'year' });
        assert.equal(res.total, 269280);
        assert.equal(res.subtotal, 338400);
        assert.equal(res.discounts.discountAmount, 69120);
    });

    // --- 2. Перевірка кожної пільги окремо (10%, 20%, 30%) ---
    await t.test('Пільга 10% (min), вік 3, місяць: 15 000 * 0.9 + 400 * 22 = 22 300', () => {
        // 13 500 + 8 800 = 22 300
        const res = calcInvoice({ age: 3, benefitType: 'min', period: 'month' });
        assert.equal(res.total, 22300);
        assert.equal(res.discounts.benefitPercent, 0.1);
        assert.equal(res.discounts.discountAmount, 1500);
    });

    await t.test('Пільга 20% (medium), вік 3, місяць: 15 000 * 0.8 + 400 * 22 = 20 800', () => {
        // 12 000 + 8 800 = 20 800
        const res = calcInvoice({ age: 3, benefitType: 'medium', period: 'month' });
        assert.equal(res.total, 20800);
        assert.equal(res.discounts.discountAmount, 3000);
    });

    await t.test('Пільга 30% (max), вік 3, місяць: 15 000 * 0.7 + 400 * 22 = 19 300', () => {
        // 10 500 + 8 800 = 19 300
        const res = calcInvoice({ age: 3, benefitType: 'max', period: 'month' });
        assert.equal(res.total, 19300);
        assert.equal(res.discounts.discountAmount, 4500);
    });

    // --- 3. Рік без пільги (знижка 12% тільки на навчання) ---
    await t.test('Рік без пільги, вік 2: 180 000 * 0.88 + 300 * 22 * 12 = 237 600', () => {
        // Навчання: 180 000 * 0.88 = 158 400 (знижка 21 600)
        // Харчування: 6 600 * 12 = 79 200
        // Разом: 158 400 + 79 200 = 237 600
        const res = calcInvoice({ age: 2, benefitType: 'none', period: 'year' });
        assert.equal(res.total, 237600);
        assert.equal(res.discounts.benefitPercent, 0);
        assert.equal(res.discounts.yearlyPercent, 0.12);
        assert.equal(res.discounts.discountAmount, 21600);
    });

    // --- 4. Граничні віки: 2 і 5 років ---
    await t.test('Мінімальний вік 2 роки працює коректно', () => {
        const res = calcInvoice({ age: 2, benefitType: 'none', period: 'month' });
        assert.equal(res.items[1].amount, 300 * 22);
    });

    await t.test('Максимальний вік 5 років працює коректно', () => {
        const res = calcInvoice({ age: 5, benefitType: 'none', period: 'month' });
        assert.equal(res.items[1].amount, 600 * 22);
    });

    // --- 5. Валідація помилок (вік поза 2-5, невідома пільга) ---
    await t.test('Помилка: вік менше 2 років (вік 1)', () => {
        assert.throws(
            () => calcInvoice({ age: 1, benefitType: 'none', period: 'month' }),
            /Недопустимий вік/
        );
    });

    await t.test('Помилка: вік більше 5 років (вік 6)', () => {
        assert.throws(
            () => calcInvoice({ age: 6, benefitType: 'none', period: 'month' }),
            /Недопустимий вік/
        );
    });

    await t.test('Помилка: невідомий benefitType', () => {
        assert.throws(
            () => calcInvoice({ age: 3, benefitType: 'super_vip', period: 'month' }),
            /Невідомий тип пільги/
        );
    });

    // --- 6. Перевірка оновлених цін у camelCase (кастомні налаштування) ---
    await t.test('Оновлені ціни (camelCase) коректно змінюють суму рахунку', () => {
        const customPrices = {
            tuitionPerMonth: 20000,
            mealsPerDayByAge: { 3: 500 },
            benefitPercent: { NONE: 0 },
            yearlyDiscountPercent: 15
        };

        // За місяць: 20 000 + 500 * 22 = 31 000
        const resMonth = calcInvoice(
            { age: 3, benefitType: 'none', period: 'month' },
            customPrices
        );
        assert.equal(resMonth.total, 31000);
        assert.equal(resMonth.items[0].amount, 20000);
        assert.equal(resMonth.items[1].amount, 11000);

        // За рік (15% знижки лише на навчання):
        // Навчання: 20 000 * 12 * 0.85 = 204 000
        // Харчування: 11 000 * 12 = 132 000
        // Разом: 336 000
        const resYear = calcInvoice(
            { age: 3, benefitType: 'none', period: 'year' },
            customPrices
        );
        assert.equal(resYear.total, 336000);
        assert.equal(resYear.discounts.yearlyPercent, 0.15);
    });
});