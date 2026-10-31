import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStaffSchedule,
  createGetStaffSchedule,
} from '../src/modules/staff/staff.service.js';
import { staffScheduleValidation } from '../src/modules/staff/staff.schema.js';

const subject = { data: { name: 'Музика' } };
const rows = [
  { id: 2, groupId: 1, subjectId: 1, subject, data: { day: 2, start: '10:00', duration: 30 } },
  { id: 1, groupId: 2, subjectId: 1, subject, data: { day: 1, start: '11:00', duration: 30 } },
  { id: 3, groupId: 1, subjectId: 1, subject, data: { day: 1, start: '09:30', duration: 30 } },
];

test('заняття відсортовані за днем і часом, є назва гуртка', () => {
  const result = buildStaffSchedule({ id: 10, data: { fullName: 'Петро' } }, rows);

  assert.equal(result.staffId, 10);
  assert.equal(result.fullName, 'Петро');
  assert.deepEqual(
    result.lessons.map((l) => [l.day, l.start]),
    [[1, '09:30'], [1, '11:00'], [2, '10:00']],
  );
  assert.equal(result.lessons[0].subjectName, 'Музика');
});

test('співробітник без занять дає порожній масив', () => {
  const result = buildStaffSchedule({ id: 5, data: { name: 'Олена' } }, []);
  assert.deepEqual(result.lessons, []);
  assert.equal(result.fullName, 'Олена');
});

test('getSchedule: неіснуючий співробітник дає 404 і заняття не запитуються', async () => {
  let lessonsCalled = false;
  const getSchedule = createGetStaffSchedule({
    staffRepository: { findById: async () => null },
    lessonsRepository: { findByStaffId: async () => { lessonsCalled = true; return []; } },
  });

  await assert.rejects(getSchedule(999), (e) => e.status === 404);
  assert.equal(lessonsCalled, false);
});

test('getSchedule: повертає розклад існуючого співробітника', async () => {
  const getSchedule = createGetStaffSchedule({
    staffRepository: { findById: async () => ({ id: 10, data: { fullName: 'Петро' } }) },
    lessonsRepository: { findByStaffId: async (id) => (id === 10 ? rows : []) },
  });

  const result = await getSchedule(10);
  assert.equal(result.lessons.length, 3);
  assert.equal(result.lessons[0].day, 1);
});

test('схема: id з URL приводиться до числа, некоректний id відхиляється', () => {
  const parse = (id) =>
    staffScheduleValidation.safeParse({ body: undefined, params: { id }, query: {} });

  const ok = parse('5');
  assert.equal(ok.success, true);
  assert.equal(ok.data.params.id, 5);

  assert.equal(parse('abc').success, false);
  assert.equal(parse('0').success, false);
  assert.equal(parse('-3').success, false);
});