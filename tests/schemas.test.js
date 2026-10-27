
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

import { createPaymentSchema } from '../src/modules/payments/payments.schema.js';
import { createSubjectSchema } from '../src/modules/subjects/subjects.schema.js';
import { groupCreateSchema } from '../src/modules/groups/groups.schema.js';
import { roomCreateSchema } from '../src/modules/rooms/rooms.schema.js';
import { createStaffSchema } from '../src/modules/staff/staff.schema.js';

// --- CHILDREN ---

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
                birthDate: '10.05.2021',
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

// --- PRICING ---

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
            query: { period: 'day' },
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

    await t.test('getInvoiceValidation: coerces string ID from URL to number', () => {
        const rawRequest = {
            params: { id: '25' },
            query: { period: 'month' },
        };

        const result = getInvoiceValidation.safeParse(rawRequest);

        assert.equal(result.success, true);
        assert.equal(typeof result.data.params.id, 'number');
        assert.equal(result.data.params.id, 25);
    });
});

// --- PAYMENTS ---

test('Payment schema: validates a valid payment', () => {
    const result = createPaymentSchema.safeParse({
        childId: 5,
        period: 'month',
        periodStart: '2026-10',
    });

    assert.strictEqual(result.success, true);
});

// --- SUBJECTS ---

test('Subject schema: validates a subject name', () => {
    const result = createSubjectSchema.safeParse({
        name: 'Робототехніка',
    });

    assert.strictEqual(result.success, true);
});

test('Subject schema: rejects an empty name', () => {
    const result = createSubjectSchema.safeParse({
        name: '',
    });

    assert.strictEqual(result.success, false);
});

// --- GROUPS ---

test('Group schema: validates creation with an allowed age', () => {
    const result = groupCreateSchema.safeParse({
        name: 'Зірочка',
        age: 3,
        roomId: 2,
    });

    assert.strictEqual(result.success, true);
});

test('Group schema: rejects an age outside the 2–5 range', () => {
    const tooYoung = groupCreateSchema.safeParse({
        name: 'Зірочка',
        age: 1,
        roomId: 2,
    });

    const tooOld = groupCreateSchema.safeParse({
        name: 'Зірочка',
        age: 6,
        roomId: 2,
    });

    assert.strictEqual(tooYoung.success, false);
    assert.strictEqual(tooOld.success, false);
});

test('Group schema: rejects negative or fractional roomId', () => {
    const negativeRoomId = groupCreateSchema.safeParse({
        name: 'Зірочка',
        age: 3,
        roomId: -1,
    });

    const fractionalRoomId = groupCreateSchema.safeParse({
        name: 'Зірочка',
        age: 3,
        roomId: 1.5,
    });

    assert.strictEqual(negativeRoomId.success, false);
    assert.strictEqual(fractionalRoomId.success, false);
});

// --- ROOMS ---

test('Room schema: validates room creation', () => {
    const result = roomCreateSchema.safeParse({
        name: 'Кімната 101',
        cost: 1500,
    });

    assert.strictEqual(result.success, true);
});

test('Room schema: rejects a negative cost', () => {
    const result = roomCreateSchema.safeParse({
        name: 'Кімната 101',
        cost: -100,
    });

    assert.strictEqual(result.success, false);
});

// --- STAFF ---

test('Staff schema: validates a staff member with all fields and IDs', () => {
    const result = createStaffSchema.safeParse({
        name: 'Марія Петрівна',
        position: 'teacher',
        salary: 12000,
        groupId: 3,
        subjectIds: [1, 2],
    });

    assert.strictEqual(result.success, true);
});

test('Staff schema: rejects an invalid position', () => {
    const result = createStaffSchema.safeParse({
        name: 'Анна',
        position: 'unknown_role',
    });

    assert.strictEqual(result.success, false);
});

test('Staff schema: rejects a negative or zero groupId', () => {
    const negativeGroupId = createStaffSchema.safeParse({
        name: 'Анна',
        position: 'teacher',
        groupId: -5,
    });

    const zeroGroupId = createStaffSchema.safeParse({
        name: 'Анна',
        position: 'teacher',
        groupId: 0,
    });

    assert.strictEqual(negativeGroupId.success, false);
    assert.strictEqual(zeroGroupId.success, false);
});
