import test from 'node:test';
import assert from 'node:assert';
import { stateAt } from '../src/modules/history/history.state.js';

test('stateAt: покриває всі 4 випадки (створено, змінено, видалено, до створення)', async (t) => {
  const mockEntries = [
    {
      data: {
        action: 'create',
        changedAt: '2026-11-01T10:00:00.000Z',
        after: { id: 1, name: 'Test 1', status: 'active' }
      }
    },
    {
      data: {
        action: 'update',
        changedAt: '2026-11-02T10:00:00.000Z',
        before: { id: 1, name: 'Test 1', status: 'active' },
        after: { id: 1, name: 'Test 2', status: 'active' }
      }
    },
    {
      data: {
        action: 'update',
        changedAt: '2026-11-03T10:00:00.000Z',
        before: { id: 1, name: 'Test 2', status: 'active' },
        after: { id: 1, name: 'Test 3', status: 'pending' }
      }
    },
    {
      data: {
        action: 'delete',
        changedAt: '2026-11-04T10:00:00.000Z',
        before: { id: 1, name: 'Test 3', status: 'pending' },
        after: null
      }
    }
  ];

  await t.test('1. Час ДО створення запису -> повертає null', () => {
    const result = stateAt(mockEntries, '2026-10-31T00:00:00.000Z');
    assert.strictEqual(result, null);
  });

  await t.test('2. Час ПІСЛЯ створення (але до оновлень) -> повертає початковий стан', () => {
    const result = stateAt(mockEntries, '2026-11-01T15:00:00.000Z');
    assert.deepStrictEqual(result, { id: 1, name: 'Test 1', status: 'active' });
  });

  await t.test('3. Час ПІСЛЯ подвійного оновлення -> повертає останній актуальний стан', () => {
    const result = stateAt(mockEntries, '2026-11-03T12:00:00.000Z');
    assert.deepStrictEqual(result, { id: 1, name: 'Test 3', status: 'pending' });
  });

  await t.test('4. Час ПІСЛЯ видалення -> повертає null', () => {
    const result = stateAt(mockEntries, '2026-11-05T00:00:00.000Z');
    assert.strictEqual(result, null);
  });
});