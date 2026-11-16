import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTeacherGuards } from '../src/middleware/teacherOwnership.js';
import { ForbiddenError, NotFoundError } from '../src/lib/errors.js';
import { ROLES } from '../src/config/roles.js';

// Підставні репозиторії: ownStaff = співробітник цього користувача (або null),
// lessons = { id: рядок заняття }. calls фіксує звернення до «бази».
function fakes({ ownStaff = null, lessons = {} } = {}) {
  const calls = [];
  return {
    calls,
    staffRepository: {
      async findByUserId(userId) {
        calls.push(['staff', userId]);
        return ownStaff;
      },
    },
    lessonsRepository: {
      async findById(id) {
        calls.push(['lesson', id]);
        return lessons[id] ?? null;
      },
    },
  };
}

// Запускає guard і повертає те, що він передав у next (помилка або undefined)
function run(guard, req) {
  return new Promise((resolve) => guard(req, {}, resolve));
}

const teacher = { id: 11, role: ROLES.TEACHER };
const withId = (id, user) => ({ user, validated: { params: { id } } });

// Перемикач авторизації на час тесту; після тесту повертаємо як було
function useAuth(t, value) {
  const before = process.env.AUTH_ENABLED;
  process.env.AUTH_ENABLED = value;
  t.after(() => {
    if (before === undefined) delete process.env.AUTH_ENABLED;
    else process.env.AUTH_ENABLED = before;
  });
}

// ---------- GET /staff/:id/schedule ----------

test('ownSchedule: викладач бачить свій розклад (staff.user_id = req.user.id)', async (t) => {
  useAuth(t, 'true');
  const f = fakes({ ownStaff: { id: 5, userId: 11 } });
  const { ownSchedule } = createTeacherGuards(f);

  assert.equal(await run(ownSchedule, withId(5, teacher)), undefined);
  assert.deepEqual(f.calls, [['staff', 11]]);
});

test('ownSchedule: id з URL рядком теж порівнюється як число', async (t) => {
  useAuth(t, 'true');
  const { ownSchedule } = createTeacherGuards(fakes({ ownStaff: { id: 5 } }));
  const req = { user: teacher, params: { id: '5' } };

  assert.equal(await run(ownSchedule, req), undefined);
});

test('ownSchedule: чужий розклад → 403', async (t) => {
  useAuth(t, 'true');
  const { ownSchedule } = createTeacherGuards(fakes({ ownStaff: { id: 5 } }));

  const err = await run(ownSchedule, withId(6, teacher));
  assert.ok(err instanceof ForbiddenError);
  assert.equal(err.status, 403);
});

test('ownSchedule: неіснуючий id дає ту саму 403, а не 404', async (t) => {
  useAuth(t, 'true');
  const { ownSchedule } = createTeacherGuards(fakes({ ownStaff: { id: 5 } }));

  const err = await run(ownSchedule, withId(999999, teacher));
  assert.ok(err instanceof ForbiddenError);
});

test('ownSchedule: викладач без зв\'язку зі співробітником → 403', async (t) => {
  useAuth(t, 'true');
  const { ownSchedule } = createTeacherGuards(fakes({ ownStaff: null }));

  const err = await run(ownSchedule, withId(5, teacher));
  assert.ok(err instanceof ForbiddenError);
});

test('ownSchedule: Admin проходить без звернення до бази', async (t) => {
  useAuth(t, 'true');
  const f = fakes({ ownStaff: null });
  const { ownSchedule } = createTeacherGuards(f);

  assert.equal(
    await run(ownSchedule, withId(6, { id: 1, role: ROLES.ADMIN })),
    undefined,
  );
  assert.equal(f.calls.length, 0);
});

test('ownSchedule: AUTH_ENABLED=false нічого не перевіряє', async (t) => {
  useAuth(t, 'false');
  const f = fakes({ ownStaff: null });
  const { ownSchedule } = createTeacherGuards(f);

  assert.equal(await run(ownSchedule, withId(6, teacher)), undefined);
  assert.equal(f.calls.length, 0);
});

test('ownSchedule: помилка бази передається далі, а не ковтається', async (t) => {
  useAuth(t, 'true');
  const boom = new Error('db down');
  const { ownSchedule } = createTeacherGuards({
    staffRepository: {
      async findByUserId() {
        throw boom;
      },
    },
    lessonsRepository: {},
  });

  assert.equal(await run(ownSchedule, withId(5, teacher)), boom);
});

// ---------- PATCH /lessons/:id ----------

test('ownLesson: викладач змінює своє заняття (lessons.staff_id = його staff.id)', async (t) => {
  useAuth(t, 'true');
  const f = fakes({
    ownStaff: { id: 5 },
    lessons: { 100: { id: 100, staffId: 5 } },
  });
  const { ownLesson } = createTeacherGuards(f);

  assert.equal(await run(ownLesson, withId(100, teacher)), undefined);
});

test('ownLesson: заняття іншого викладача → 403', async (t) => {
  useAuth(t, 'true');
  const f = fakes({
    ownStaff: { id: 5 },
    lessons: { 200: { id: 200, staffId: 6 } },
  });
  const { ownLesson } = createTeacherGuards(f);

  const err = await run(ownLesson, withId(200, teacher));
  assert.ok(err instanceof ForbiddenError);
  assert.equal(err.status, 403);
});

test('ownLesson: неіснуюче заняття → 404', async (t) => {
  useAuth(t, 'true');
  const { ownLesson } = createTeacherGuards(fakes({ ownStaff: { id: 5 } }));

  const err = await run(ownLesson, withId(999999, teacher));
  assert.ok(err instanceof NotFoundError);
  assert.equal(err.status, 404);
});

test('ownLesson: без зв\'язку зі співробітником → 403, заняття не запитується', async (t) => {
  useAuth(t, 'true');
  const f = fakes({
    ownStaff: null,
    lessons: { 100: { id: 100, staffId: 5 } },
  });
  const { ownLesson } = createTeacherGuards(f);

  const err = await run(ownLesson, withId(100, teacher));
  assert.ok(err instanceof ForbiddenError);
  assert.deepEqual(f.calls, [['staff', 11]]);
});

test('ownLesson: Admin змінює будь-яке заняття без звернення до бази', async (t) => {
  useAuth(t, 'true');
  const f = fakes({ ownStaff: null });
  const { ownLesson } = createTeacherGuards(f);

  assert.equal(
    await run(ownLesson, withId(200, { id: 1, role: ROLES.ADMIN })),
    undefined,
  );
  assert.equal(f.calls.length, 0);
});

test('ownLesson: AUTH_ENABLED=false нічого не перевіряє', async (t) => {
  useAuth(t, 'false');
  const f = fakes({ ownStaff: null });
  const { ownLesson } = createTeacherGuards(f);

  assert.equal(await run(ownLesson, withId(200, teacher)), undefined);
  assert.equal(f.calls.length, 0);
});
