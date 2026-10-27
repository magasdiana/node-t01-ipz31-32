import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createChildValidation,
    updateChildValidation,
} from '../src/modules/children/children.schema.js';
import {
    getInvoiceValidation,
    updatePricesSchema,
} from '../src/modules/pricing/pricing.schema.js';

test('children schemas validation', async (t) => {
    await t.test('createChildValidation: passes with valid data', () => {
        const validData = {
            body: {
                name: 'Оленка',
                birthDate: '2021-05-10',
                guardians: ['Мама', 'Тато'],
                benefitType: 'none',
            },
            params: {},
            query: {},
        };
        const result = createChildValidation.safeParse(validData);
        assert.equal(result.success, true);
    });

    await t.test('createChildValidation: fails on invalid date format', () => {
        const invalidData = {
            body: {
                name: 'Оленка',
                birthDate: '10.05.2021', // не YYYY-MM-DD
            },
        };
        const result = createChildValidation.safeParse(invalidData);
        assert.equal(result.success, false);
    });

    await t.test('createChildValidation: fails when more than 3 guardians', () => {
        const invalidData = {
            body: {
                name: 'Оленка',
                birthDate: '2021-05-10',
                guardians: ['Опікун 1', 'Опікун 2', 'Опікун 3', 'Опікун 4'],
            },
        };
        const result = createChildValidation.safeParse(invalidData);
        assert.equal(result.success, false);
    });

    await t.test('createChildValidation: fails with empty name', () => {
        const invalidData = {
            body: {
                name: '   ',
                birthDate: '2021-05-10',
            },
        };
        const result = createChildValidation.safeParse(invalidData);
        assert.equal(result.success, false);
    });

    await t.test('updateChildValidation: fails on empty body', () => {
        const emptyUpdate = {
            body: {},
            params: { id: 1 },
        };
        const result = updateChildValidation.safeParse(emptyUpdate);
        assert.equal(result.success, false);
    });

    await t.test('updateChildValidation: fails on non-positive ID param', () => {
        const invalidParams = {
            body: { name: 'Нове імʼя' },
            params: { id: -5 },
        };
        const result = updateChildValidation.safeParse(invalidParams);
        assert.equal(result.success, false);
    });
});

test('pricing schemas validation', async (t) => {
    await t.test('getInvoiceValidation: passes with valid period and id', () => {
        const validData = {
            params: { id: 1 },
            query: { period: 'year' },
        };
        const result = getInvoiceValidation.safeParse(validData);
        assert.equal(result.success, true);
    });

    await t.test('getInvoiceValidation: fails with unknown period', () => {
        const invalidData = {
            params: { id: 1 },
            query: { period: 'day' }, // Дозволено лише month або year
        };
        const result = getInvoiceValidation.safeParse(invalidData);
        assert.equal(result.success, false);
    });

    await t.test('updatePricesSchema: passes with partial valid prices', () => {
        const validData = {
            body: {
                tuitionPerMonth: 6000,
            },
        };
        const result = updatePricesSchema.safeParse(validData);
        assert.equal(result.success, true);
    });

    await t.test('updatePricesSchema: fails on empty body', () => {
        const emptyBody = {
            body: {},
        };
        const result = updatePricesSchema.safeParse(emptyBody);
        assert.equal(result.success, false);
    });

    await t.test('updatePricesSchema: fails on negative price', () => {
        const negativePrice = {
            body: {
                tuitionPerMonth: -100,
            },
        };
        const result = updatePricesSchema.safeParse(negativePrice);
        assert.equal(result.success, false);
    });

    await t.test('getInvoiceValidation: перетворює рядковий id з URL на число (coercion)', () => {
        const rawRequest = {
            params: { id: '25' }, // з URL завжди приходить string
            query: { period: 'month' },
        };
        const result = getInvoiceValidation.safeParse(rawRequest);
        assert.equal(result.success, true);
        assert.equal(typeof result.data.params.id, 'number');
        assert.equal(result.data.params.id, 25);
    });
});