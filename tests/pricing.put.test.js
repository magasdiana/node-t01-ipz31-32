import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PRICES } from '../src/config/constants.js';
import { pricingRepository } from '../src/modules/pricing/pricing.repository.js';
import { pricingService } from '../src/modules/pricing/pricing.service.js';
import { paymentsRepository } from '../src/modules/payments/payments.repository.js';
import { paymentsService } from '../src/modules/payments/payments.service.js';
import { childrenService } from '../src/modules/children/children.service.js';
import { updatePricesSchema } from '../src/modules/pricing/pricing.schema.js';

// Тест без бази: репозиторії підмінено сховищем у пам'яті.
// initialData = null означає порожню базу без seed
function setup(initialData = structuredClone(DEFAULT_PRICES)) {
    let row = initialData ? { id: 1, data: initialData } : null;
    const history = [];
    const payments = [];

    mock.method(pricingRepository, 'getSettings', async () => row);
    mock.method(pricingRepository, 'createSettings', async (data) => {
        row = { id: 1, data };
        return row;
    });
    mock.method(pricingRepository, 'updateSettingsWithHistory', async (id, newPrices, oldPrices) => {
        row = { id, data: newPrices };
        history.push({ before: oldPrices, after: newPrices });
        return row;
    });
    mock.method(childrenService, 'getById', async () => ({ id: 7, age: 4, benefitType: 'medium' }));
    mock.method(paymentsRepository, 'create', async (childId, data) => {
        const record = { id: payments.length + 1, childId, data };
        payments.push(record);
        return record;
    });

    return { history, payments };
}

test('PUT /settings/prices: нові ціни змінюють наступний рахунок і пишуться в price_history', async (t) => {
    const { history } = setup();
    t.after(() => mock.restoreAll());

    // Вік 4, пільга 20%, місяць = 15 000 * 0.8 + 500 * 22 = 23 000
    const before = await pricingService.getChildInvoice(7, 'month');
    assert.equal(before.total, 23000);

    await pricingService.updatePrices({
        tuitionMonthly: 20000,
        benefitPercent: { LEVEL_2: 50 },
        annualPaymentPercent: 25
    });

    // Місяць: 20 000 * 0.5 + 11 000 = 21 000
    const month = await pricingService.getChildInvoice(7, 'month');
    assert.equal(month.total, 21000);
    assert.equal(month.discounts.benefitPercent, 0.5);

    // Рік: навчання 240 000 * 0.5 * 0.75 = 90 000; харчування 132 000; разом 222 000
    const year = await pricingService.getChildInvoice(7, 'year');
    assert.equal(year.discounts.yearlyPercent, 0.25);
    assert.equal(year.total, 222000);

    // Запис в історії: до і після
    assert.equal(history.length, 1);
    assert.equal(history[0].before.tuitionMonthly, 15000);
    assert.equal(history[0].after.tuitionMonthly, 20000);
    assert.equal(history[0].after.benefitPercent.LEVEL_2, 50);
    assert.equal(history[0].after.benefitPercent.LEVEL_3, 30); // інші пільги не загубились
});

test('Перший PUT на базі без seed не ламає рахунок', async (t) => {
    setup(null);
    t.after(() => mock.restoreAll());

    const first = await pricingService.getChildInvoice(7, 'month');
    assert.equal(first.total, 23000);

    await pricingService.updatePrices({ annualPaymentPercent: 20 });
    const year = await pricingService.getChildInvoice(7, 'year');
    assert.equal(year.discounts.yearlyPercent, 0.2);
});

test('Знімок оплати містить items (навчання і харчування) з рахунку', async (t) => {
    const { payments } = setup();
    t.after(() => mock.restoreAll());

    await pricingService.updatePrices({ tuitionMonthly: 20000 });
    const payment = await paymentsService.createPayment({ childId: 7, period: 'month' });

    assert.deepEqual(payment.items, [
        { name: 'tuition', amount: 20000 },
        { name: 'meals', amount: 11000 }
    ]);
    assert.equal(payment.amount, 20000 * 0.8 + 11000);
    assert.equal(payments[0].data.items.length, 2);
});

test('Схема PUT /settings/prices: єдині ключі, відсотки 0-100, старі ключі відхиляються', () => {
    const ok = (body) => updatePricesSchema.safeParse({ body }).success;
    assert.equal(ok({ tuitionMonthly: 16000 }), true);
    assert.equal(ok({ annualPaymentPercent: 15 }), true);
    assert.equal(ok({ benefitPercent: { LEVEL_1: 10 } }), true);
    assert.equal(ok({ mealsPerDayByAge: { 3: 450 } }), true);
    assert.equal(ok({}), false);
    assert.equal(ok({ tuitionPerMonth: 16000 }), false);
    assert.equal(ok({ yearlyDiscount: 12 }), false);
    assert.equal(ok({ annualPaymentPercent: 120 }), false);
    assert.equal(ok({ benefitPercent: { VIP: 10 } }), false);
});