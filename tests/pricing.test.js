import test from 'node:test';
import assert from 'node:assert/strict';
import { calcInvoice } from '../src/modules/pricing/pricing.calc.js';

test('Dev 3: Тести розрахунку рахунку (FR-23...FR-28)', async (t) => {
    // --- 1. Контрольні приклади з розділу 4.2 ТЗ ---
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

    await t.test('Приклад 2: Вік 4, пільга 20% (medium), місяць = 20 800', () => {
        // (15 000 + 500 * 22) * 0.8 = 26 000 * 0.8 = 20 800
        const res = calcInvoice({ age: 4, benefitType: 'medium', period: 'month' });
        assert.equal(res.total, 20800);
        assert.equal(res.subtotal, 26000);
        assert.equal(res.discounts.benefitPercent, 0.2);
        assert.equal(res.discounts.discountAmount, 5200);
        assert.equal(res.items.length, 2);
    });

    await t.test('Приклад 3: Вік 4, пільга 20% (medium), рік = 219 648', () => {
        // 26 000 * 12 * 0.8 * 0.88 = 219 648
        const res = calcInvoice({ age: 4, benefitType: 'medium', period: 'year' });
        assert.equal(res.total, 219648);
        assert.equal(res.subtotal, 312000);
        assert.equal(res.months, 12);
        assert.equal(res.discounts.yearlyPercent, 0.12);
    });

    await t.test('Приклад 4: Вік 5, пільга 30% (max), рік = 208 454.40', () => {
        // (15 000 + 600 * 22) * 12 * 0.7 * 0.88 = 28 200 * 12 * 0.7 * 0.88 = 208 454.40
        const res = calcInvoice({ age: 5, benefitType: 'max', period: 'year' });
        assert.equal(res.total, 208454.4);
        assert.equal(res.subtotal, 338400);
    });

    // --- 2. Перевірка кожної пільги окремо (10%, 20%, 30%) ---
    await t.test('Пільга 10% (min), вік 3, місяць: (15 000 + 400 * 22) * 0.9 = 21 420', () => {
        const res = calcInvoice({ age: 3, benefitType: 'min', period: 'month' });
        assert.equal(res.total, 21420);
        assert.equal(res.discounts.benefitPercent, 0.1);
    });

    await t.test('Пільга 20% (medium), вік 3, місяць: 23 800 * 0.8 = 19 040', () => {
        const res = calcInvoice({ age: 3, benefitType: 'medium', period: 'month' });
        assert.equal(res.total, 19040);
    });

    await t.test('Пільга 30% (max), вік 3, місяць: 23 800 * 0.7 = 16 660', () => {
        const res = calcInvoice({ age: 3, benefitType: 'max', period: 'month' });
        assert.equal(res.total, 16660);
    });

    // --- 3. Рік без пільги (знижка 12%) ---
    await t.test('Рік без пільги, вік 2: 21 600 * 12 * 0.88 = 228 096', () => {
        const res = calcInvoice({ age: 2, benefitType: 'none', period: 'year' });
        assert.equal(res.total, 228096);
        assert.equal(res.discounts.benefitPercent, 0);
        assert.equal(res.discounts.yearlyPercent, 0.12);
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
});