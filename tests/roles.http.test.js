import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { ACCESS } from '../src/config/access.js';
import { ROLES } from '../src/config/roles.js';
import { DEMO_USERS } from '../prisma/seed.users.js';

// Права ролей на справжньому застосунку з AUTH_ENABLED=true.
// Потрібна база після `npm run seed`: демо-користувачі, parent -> дитина,
// teacher -> співробітник. Тест лише читає дані; єдиний запис, два заняття,
// створюється на час тесту й видаляється в after.

const MISSING_ID = 2147483647; // id, якого не існує
const SEED_HINT = 'Запустіть npm run seed (демо-користувачі й зв\'язки ролей)';

let server;
let base;
let prevAuthEnabled;
const tokens = {};
const ids = {};

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token && { authorization: `Bearer ${token}` }),
      ...(body !== undefined && { 'content-type': 'application/json' }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

async function login(role) {
  const demo = DEMO_USERS.find((u) => u.role === role);
  const res = await call('POST', '/auth/login', {
    body: { login: demo.login, password: demo.password },
  });
  assert.equal(res.status, 200, `login ${role}: ${res.status}. ${SEED_HINT}`);
  return { token: res.body.token, userId: res.body.user.id };
}

// Контекст для тригерів історії, як у prisma/seed.js
async function inContext(fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT
        set_config('app.source', 'test'::text, true) AS source,
        set_config('app.request_id', ${`roles-http-${Date.now()}`}::text, true) AS request_id,
        set_config('app.actor', ''::text, true) AS actor
    `;
    return fn(tx);
  });
}

before(async () => {
  prevAuthEnabled = process.env.AUTH_ENABLED;
  process.env.AUTH_ENABLED = 'true';

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  const users = {};
  for (const role of Object.values(ROLES)) {
    const { token, userId } = await login(role);
    tokens[role] = token;
    users[role] = userId;
  }

  const teacherStaff = await prisma.staff.findUnique({
    where: { userId: users[ROLES.TEACHER] },
  });
  assert.ok(teacherStaff, `teacher не пов'язаний зі співробітником. ${SEED_HINT}`);

  const otherStaff = await prisma.staff.findFirst({
    where: { id: { not: teacherStaff.id } },
    orderBy: { id: 'asc' },
  });
  const ownChild = await prisma.child.findFirst({
    where: { parentId: users[ROLES.PARENT] },
    orderBy: { id: 'asc' },
  });
  assert.ok(ownChild, `parent не пов'язаний із дитиною. ${SEED_HINT}`);

  const group = await prisma.group.findFirst({ orderBy: { id: 'asc' } });
  const subject = await prisma.subject.findFirst({ orderBy: { id: 'asc' } });
  assert.ok(otherStaff && group && subject, SEED_HINT);

  // Два заняття в різних викладачів: своє і чуже для teacher
  const [ownLesson, foreignLesson] = await inContext(async (tx) => [
    await tx.lesson.create({
      data: {
        groupId: group.id,
        subjectId: subject.id,
        staffId: teacherStaff.id,
        data: { day: 2, start: '10:00', duration: 30 },
      },
    }),
    await tx.lesson.create({
      data: {
        groupId: group.id,
        subjectId: subject.id,
        staffId: otherStaff.id,
        data: { day: 3, start: '10:00', duration: 30 },
      },
    }),
  ]);

  Object.assign(ids, {
    teacherStaff: teacherStaff.id,
    otherStaff: otherStaff.id,
    ownChild: ownChild.id,
    group: group.id,
    subject: subject.id,
    ownLesson: ownLesson.id,
    foreignLesson: foreignLesson.id,
  });
});

after(async () => {
  try {
    if (ids.ownLesson) {
      await inContext((tx) =>
        tx.lesson.deleteMany({
          where: { id: { in: [ids.ownLesson, ids.foreignLesson] } },
        }),
      );
    }
  } finally {
    if (prevAuthEnabled === undefined) delete process.env.AUTH_ENABLED;
    else process.env.AUTH_ENABLED = prevAuthEnabled;
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  }
});

// ---------- Перший шар: чи має роль право на маршрут ----------
// Дозволена роль не отримує 401/403 (далі можуть бути 200, 400, 404: залежно від даних),
// заборонена отримує 403 у єдиному форматі. Тіла запитів навмисно невалідні, а id
// для зміни й видалення неіснуючі, щоб ніщо не записувалося в базу.

function routes() {
  const c = ids.ownChild;
  const g = ids.group;
  return [
    ['GET', '/children', ACCESS.CHILDREN_READ],
    ['GET', `/children/${c}`, ACCESS.CHILDREN_READ],
    ['POST', '/children', ACCESS.CHILDREN_CREATE, { birthDate: 'not-a-date' }],
    ['PATCH', `/children/${c}`, ACCESS.CHILDREN_UPDATE, {}],
    ['DELETE', `/children/${MISSING_ID}`, ACCESS.CHILDREN_DELETE],
    ['GET', `/children/${c}/invoice`, ACCESS.CHILDREN_INVOICE],
    ['GET', `/children/${c}/history`, ACCESS.HISTORY],

    ['GET', '/groups', ACCESS.GROUPS_READ],
    ['GET', `/groups/${g}`, ACCESS.GROUPS_READ],
    ['POST', '/groups', ACCESS.GROUPS_WRITE, { age: 99 }],
    ['PATCH', `/groups/${MISSING_ID}`, ACCESS.GROUPS_WRITE, { age: 99 }],
    ['DELETE', `/groups/${MISSING_ID}`, ACCESS.GROUPS_DELETE],
    ['GET', `/groups/${g}/history`, ACCESS.HISTORY],
    ['GET', `/groups/${g}/lessons`, ACCESS.GROUP_LESSONS],

    ['GET', '/rooms', ACCESS.ROOMS_READ],
    ['GET', `/rooms/${MISSING_ID}`, ACCESS.ROOMS_READ],
    ['POST', '/rooms', ACCESS.ROOMS_WRITE, { cost: -1 }],
    ['PATCH', `/rooms/${MISSING_ID}`, ACCESS.ROOMS_WRITE, { cost: -1 }],
    ['DELETE', `/rooms/${MISSING_ID}`, ACCESS.ROOMS_WRITE],

    ['GET', '/staff', ACCESS.STAFF_ALL],
    ['GET', `/staff/${ids.otherStaff}`, ACCESS.STAFF_ALL],
    ['POST', '/staff', ACCESS.STAFF_ALL, { position: 'nope' }],
    ['PATCH', `/staff/${MISSING_ID}`, ACCESS.STAFF_ALL, { position: 'nope' }],
    ['DELETE', `/staff/${MISSING_ID}`, ACCESS.STAFF_ALL],
    ['GET', `/staff/${ids.teacherStaff}/schedule`, ACCESS.STAFF_SCHEDULE],

    ['GET', '/subjects', ACCESS.SUBJECTS_ALL],
    ['GET', `/subjects/${ids.subject}`, ACCESS.SUBJECTS_ALL],
    ['POST', '/subjects', ACCESS.SUBJECTS_ALL, { name: '' }],
    ['PATCH', `/subjects/${MISSING_ID}`, ACCESS.SUBJECTS_ALL, { name: '' }],
    ['DELETE', `/subjects/${MISSING_ID}`, ACCESS.SUBJECTS_ALL],

    ['PATCH', `/lessons/${ids.ownLesson}`, ACCESS.LESSON_UPDATE, {}],
    ['POST', '/schedules', ACCESS.SCHEDULES_GENERATE, { groupIds: [] }],

    ['GET', '/payments', ACCESS.PAYMENTS_READ],
    ['GET', `/payments/${MISSING_ID}`, ACCESS.PAYMENTS_READ],
    ['POST', '/payments', ACCESS.PAYMENTS_CREATE, {}],
    ['DELETE', `/payments/${MISSING_ID}`, ACCESS.PAYMENTS_DELETE],

    ['GET', '/reports/profit', ACCESS.REPORTS],
    ['GET', '/reports/min-rooms', ACCESS.REPORTS],
    ['GET', '/reports/forecast-profit', ACCESS.REPORTS],

    ['GET', '/settings/prices', ACCESS.PRICES],
    ['PUT', '/settings/prices', ACCESS.PRICES, {}],
    ['GET', '/settings/prices/history', ACCESS.PRICES],

    ['GET', '/history', ACCESS.HISTORY],
    ['GET', '/history/state', ACCESS.HISTORY],
    ['GET', '/history/1', ACCESS.HISTORY],

    ['GET', '/users', ACCESS.USERS],
  ];
}

test('матриця ролей: заборонена роль → 403, дозволена не отримує 401/403', async () => {
  const failures = [];

  for (const [method, path, allowed, body] of routes()) {
    for (const role of Object.values(ROLES)) {
      const res = await call(method, path, { token: tokens[role], body });
      const label = `${role} ${method} ${path} → ${res.status}`;

      if (allowed.includes(role)) {
        if (res.status === 401 || res.status === 403) failures.push(`${label} (мало бути дозволено)`);
      } else if (res.status !== 403 || res.body?.error?.status !== 403) {
        failures.push(`${label} (мало бути 403)`);
      }
    }
  }

  assert.deepEqual(failures, []);
});

test('матриця ролей: без токена захищені маршрути дають 401', async () => {
  for (const [method, path] of [
    ['GET', '/children'],
    ['GET', '/staff'],
    ['GET', '/reports/profit'],
    ['GET', '/history'],
    ['PATCH', `/lessons/${ids.ownLesson}`],
  ]) {
    const res = await call(method, path);
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test('публічні маршрути відкриті без токена', async () => {
  assert.equal((await call('GET', '/health')).status, 200);
  assert.equal((await call('GET', '/openapi.json')).status, 200);
});

// ---------- Другий шар: Teacher бачить і змінює лише своє ----------

test('Teacher: власний розклад → 200', async () => {
  const res = await call('GET', `/staff/${ids.teacherStaff}/schedule`, {
    token: tokens[ROLES.TEACHER],
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.staffId, ids.teacherStaff);
  assert.ok(res.body.lessons.some((l) => l.id === ids.ownLesson));
});

test('Teacher: чужий розклад → 403', async () => {
  const res = await call('GET', `/staff/${ids.otherStaff}/schedule`, {
    token: tokens[ROLES.TEACHER],
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.status, 403);
});

test('Teacher: неіснуючий співробітник → 403, а не 404', async () => {
  const res = await call('GET', `/staff/${MISSING_ID}/schedule`, {
    token: tokens[ROLES.TEACHER],
  });
  assert.equal(res.status, 403);
});

test('Admin бачить розклад будь-якого співробітника', async () => {
  const res = await call('GET', `/staff/${ids.otherStaff}/schedule`, {
    token: tokens[ROLES.ADMIN],
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.staffId, ids.otherStaff);
});

test('Manager і Parent не бачать розклад співробітника', async () => {
  for (const role of [ROLES.MANAGER, ROLES.PARENT]) {
    const res = await call('GET', `/staff/${ids.teacherStaff}/schedule`, {
      token: tokens[role],
    });
    assert.equal(res.status, 403, role);
  }
});

test('Teacher: змінює власне заняття → 200', async () => {
  // 23:00 в п'ятницю: поза вікном звичайного розкладу, конфліктів немає
  const res = await call('PATCH', `/lessons/${ids.ownLesson}`, {
    token: tokens[ROLES.TEACHER],
    body: { day: 5, start: '23:00' },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.day, 5);
  assert.equal(res.body.start, '23:00');
});

test('Teacher: заняття іншого викладача → 403, заняття не змінюється', async () => {
  const before = await prisma.lesson.findUnique({ where: { id: ids.foreignLesson } });

  const res = await call('PATCH', `/lessons/${ids.foreignLesson}`, {
    token: tokens[ROLES.TEACHER],
    body: { day: 4, start: '10:00' },
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.status, 403);

  const after = await prisma.lesson.findUnique({ where: { id: ids.foreignLesson } });
  assert.deepEqual(after.data, before.data);
});

test('Teacher: неіснуюче заняття → 404', async () => {
  const res = await call('PATCH', `/lessons/${MISSING_ID}`, {
    token: tokens[ROLES.TEACHER],
    body: { day: 4, start: '10:00' },
  });
  assert.equal(res.status, 404);
});

test('Admin змінює заняття будь-якого викладача', async () => {
  const res = await call('PATCH', `/lessons/${ids.foreignLesson}`, {
    token: tokens[ROLES.ADMIN],
    body: { day: 5, start: '22:00' },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
});

test('Manager і Parent не змінюють заняття', async () => {
  for (const role of [ROLES.MANAGER, ROLES.PARENT]) {
    const res = await call('PATCH', `/lessons/${ids.ownLesson}`, {
      token: tokens[role],
      body: { day: 4, start: '10:00' },
    });
    assert.equal(res.status, 403, role);
  }
});
