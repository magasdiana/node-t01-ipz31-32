import test from 'node:test';
import assert from 'node:assert';
import { createPaymentSchema } from '../src/modules/payments/payments.schema.js';
import { createSubjectSchema } from '../src/modules/subjects/subjects.schema.js';
import { groupCreateSchema } from '../src/modules/groups/groups.schema.js';
import { roomCreateSchema } from '../src/modules/rooms/rooms.schema.js';
import { createStaffSchema } from '../src/modules/staff/staff.schema.js';

// --- PAYMENTS ---
test('Payment schema: успішно валідує валідний платіж', () => {
  const result = createPaymentSchema.safeParse({ 
    childId: 5, 
    period: 'month', 
    periodStart: '2026-10' 
  });
  assert.strictEqual(result.success, true);
});

// --- SUBJECTS ---
test('Subject schema: успішно валідує назву гуртка', () => {
  const valid = createSubjectSchema.safeParse({ name: 'Робототехніка' });
  assert.strictEqual(valid.success, true);
});

test('Subject schema: відхиляє порожню назву', () => {
  const invalid = createSubjectSchema.safeParse({ name: '' });
  assert.strictEqual(invalid.success, false);
});

// --- GROUPS ---
test('Group schema: успішно валідує створення групи з допустимим віком', () => {
  const valid = groupCreateSchema.safeParse({ name: 'Зірочка', age: 3, roomId: 2 });
  assert.strictEqual(valid.success, true);
});

test('Group schema: відхиляє вік поза межами діапазону (менше 2 або більше 5)', () => {
  const invalidTooYoung = groupCreateSchema.safeParse({ name: 'Зірочка', age: 1, roomId: 2 });
  const invalidTooOld = groupCreateSchema.safeParse({ name: 'Зірочка', age: 6, roomId: 2 });
  assert.strictEqual(invalidTooYoung.success, false);
  assert.strictEqual(invalidTooOld.success, false);
});

test('Group schema: відхиляє невалідний roomId (від’ємне або дробове число)', () => {
  const invalidNegative = groupCreateSchema.safeParse({ name: 'Зірочка', age: 3, roomId: -1 });
  const invalidDecimal = groupCreateSchema.safeParse({ name: 'Зірочка', age: 3, roomId: 1.5 });
  assert.strictEqual(invalidNegative.success, false);
  assert.strictEqual(invalidDecimal.success, false);
});

// --- ROOMS ---
test('Room schema: успішно валідує створення кімнати', () => {
  const valid = roomCreateSchema.safeParse({ name: 'Кімната 101', cost: 1500 });
  assert.strictEqual(valid.success, true);
});

test('Room schema: відхиляє від’ємну вартість', () => {
  const invalid = roomCreateSchema.safeParse({ name: 'Кімната 101', cost: -100 });
  assert.strictEqual(invalid.success, false);
});

// --- STAFF ---
test('Staff schema: успішно валідує створення співробітника з усіма полями та ID', () => {
  const valid = createStaffSchema.safeParse({
    name: 'Марія Петрівна',
    position: 'teacher',
    salary: 12000,
    groupId: 3,
    subjectIds: [1, 2],
  });
  assert.strictEqual(valid.success, true);
});

test('Staff schema: відхиляє невалідну посаду', () => {
  const invalidPosition = createStaffSchema.safeParse({
    name: 'Анна',
    position: 'unknown_role',
  });
  assert.strictEqual(invalidPosition.success, false);
});

test('Staff schema: відхиляє від’ємний або нульовий groupId', () => {
  const invalidGroupIdNeg = createStaffSchema.safeParse({
    name: 'Анна',
    position: 'teacher',
    groupId: -5,
  });
  const invalidGroupIdZero = createStaffSchema.safeParse({
    name: 'Анна',
    position: 'teacher',
    groupId: 0,
  });
  assert.strictEqual(invalidGroupIdNeg.success, false);
  assert.strictEqual(invalidGroupIdZero.success, false);
});