import test from 'node:test';
import assert from 'node:assert';
import { createPaymentSchema } from '../src/modules/payments/payments.schema.js';
import { createSubjectSchema } from '../src/modules/subjects/subjects.schema.js';

test('Payment schema: успішно валідує обов’язковий childId', () => {
  const result = createPaymentSchema.safeParse({ childId: 5, period: 'month' });
  assert.strictEqual(result.success, true);
});

test('Payment schema: відхиляє запит без childId', () => {
  const result = createPaymentSchema.safeParse({ period: 'year' });
  assert.strictEqual(result.success, false);
});

test('Subject schema: перевіряє наявність назви', () => {
  const valid = createSubjectSchema.safeParse({ name: 'Робототехніка' });
  assert.strictEqual(valid.success, true);

  const invalid = createSubjectSchema.safeParse({ name: '' });
  assert.strictEqual(invalid.success, false);
});