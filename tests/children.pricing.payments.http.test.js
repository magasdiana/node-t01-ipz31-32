import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';

// Фінальна інтеграційна перевірка модулів children, pricing, payments (тиждень 7).
// Працює через HTTP з реальною базою (потрібні міграції; seed не обов'язковий).
// Тест сам створює дітей, групи й оплати та прибирає їх у after.
// Ціни на час тесту виставляються у відомі значення, а в after повертаються назад.

const MISSING_ID = 2147483647;

let server;
let base;
let prevAuthEnabled;
let originalPrices;

const created = { payments: [], children: [], groups: [] };

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

// Дата народження, за якої дитині зараз рівно age повних років
function birthFor(age) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear() - age, now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 10);
}

async function makeChild(overrides = {}) {
  const res = await call('POST', '/children', {
    name: 'Інтеграційний Тест',
    birthDate: birthFor(3),
    guardians: ['Опікун Один'],
    ...overrides,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  created.children.push(res.body.id);
  return res.body;
}

async function makeGroup(overrides = {}) {
  const res = await call('POST', '/groups', { name: 'Тестова група', age: 3, ...overrides });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  created.groups.push(res.body.id);
  return res.body;
}

async function makePayment(body) {
  const res = await call('POST', '/payments', body);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  created.payments.push(res.body.id);
  return res.body;
}

const pickPrices = (p) => ({
  tuitionMonthly: p.tuitionMonthly,
  mealsPerDayByAge: p.mealsPerDayByAge,
  benefitPercent: p.benefitPercent,
  annualPaymentPercent: p.annualPaymentPercent,
});

before(async () => {
  prevAuthEnabled = process.env.AUTH_ENABLED;
  process.env.AUTH_ENABLED = 'false';

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  const current = await call('GET', '/settings/prices');
  assert.equal(current.status, 200);
  originalPrices = pickPrices(current.body);

  const known = await call('PUT', '/settings/prices', {
    tuitionMonthly: 15000,
    mealsPerDayByAge: { 2: 300, 3: 400, 4: 500, 5: 600 },
    benefitPercent: { NONE: 0, LEVEL_1: 10, LEVEL_2: 20, LEVEL_3: 30 },
    annualPaymentPercent: 12,
  });
  assert.equal(known.status, 200, JSON.stringify(known.body));
});

after(async () => {
  try {
    for (const id of created.payments) await call('DELETE', `/payments/${id}`);
    for (const id of created.children) await call('DELETE', `/children/${id}`);
    for (const id of created.groups) await call('DELETE', `/groups/${id}`);
    if (originalPrices) await call('PUT', '/settings/prices', originalPrices);
  } finally {
    if (prevAuthEnabled === undefined) delete process.env.AUTH_ENABLED;
    else process.env.AUTH_ENABLED = prevAuthEnabled;
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    const { prisma } = await import('../src/lib/prisma.js');
    await prisma.$disconnect();
  }
});

// ---------- Діти ----------

test('children: створення, читання, оновлення і видалення', async () => {
  const child = await makeChild({ name: '  Марійка  ', preferences: 'без горіхів' });
  assert.equal(child.name, 'Марійка');
  assert.equal(child.age, 3);
  assert.equal(child.benefitType, 'none');
  assert.equal(child.relativeVip, false);
  assert.deepEqual(child.guardians, ['Опікун Один']);
  assert.equal(child.groupId, null);

  const got = await call('GET', `/children/${child.id}`);
  assert.equal(got.status, 200);
  assert.equal(got.body.id, child.id);

  const patched = await call('PATCH', `/children/${child.id}`, { name: 'Марія', benefitType: 'min' });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.name, 'Марія');
  assert.equal(patched.body.benefitType, 'min');
  assert.equal(patched.body.birthDate, child.birthDate);

  const list = await call('GET', '/children');
  assert.equal(list.status, 200);
  assert.ok(list.body.some((c) => c.id === child.id));

  const del = await call('DELETE', `/children/${child.id}`);
  assert.equal(del.status, 200);
  created.children = created.children.filter((id) => id !== child.id);

  assert.equal((await call('GET', `/children/${child.id}`)).status, 404);
});

test('children: relativeVip автоматично дає пільгу max, зняття повертає none', async () => {
  const child = await makeChild({ relativeVip: true });
  assert.equal(child.benefitType, 'max');

  const off = await call('PATCH', `/children/${child.id}`, { relativeVip: false });
  assert.equal(off.status, 200);
  assert.equal(off.body.benefitType, 'none');
});

test('children: не більше 3 опікунів (FR-02), рівно 3 дозволено', async () => {
  const bad = await call('POST', '/children', {
    name: 'Тест',
    birthDate: birthFor(3),
    guardians: ['А', 'Б', 'В', 'Г'],
  });
  assert.equal(bad.status, 400);

  const ok = await makeChild({ guardians: ['А', 'Б', 'В'] });
  assert.equal(ok.guardians.length, 3);

  const patchBad = await call('PATCH', `/children/${ok.id}`, { guardians: ['А', 'Б', 'В', 'Г'] });
  assert.equal(patchBad.status, 400);
});

test('children: вік 2–5 років (FR-01): межі приймаються, поза межами 409', async () => {
  for (const age of [2, 5]) {
    const child = await makeChild({ birthDate: birthFor(age) });
    assert.equal(child.age, age);
  }
  for (const age of [1, 6]) {
    const res = await call('POST', '/children', { name: 'Тест', birthDate: birthFor(age) });
    assert.equal(res.status, 409, `вік ${age}: ${JSON.stringify(res.body)}`);
  }
});

test('children: невалідні дані дають 400, неіснуючий id 404', async () => {
  const cases = [
    { name: '', birthDate: birthFor(3) },
    { name: 'Тест', birthDate: '2024-02-30' },
    { name: 'Тест', birthDate: '03.05.2023' },
    { name: 'Тест', birthDate: birthFor(3), benefitType: 'huge' },
    { birthDate: birthFor(3) },
    {},
  ];
  for (const body of cases) {
    const res = await call('POST', '/children', body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(typeof res.body.error.message, 'string');
  }

  assert.equal((await call('GET', '/children/abc')).status, 400);
  assert.equal((await call('GET', '/children/0')).status, 400);
  assert.equal((await call('GET', `/children/${MISSING_ID}`)).status, 404);
  assert.equal((await call('PATCH', `/children/${MISSING_ID}`, { name: 'Х' })).status, 404);
  assert.equal((await call('DELETE', `/children/${MISSING_ID}`)).status, 404);

  const child = await makeChild();
  assert.equal((await call('PATCH', `/children/${child.id}`, {})).status, 400);
});

test('children: PATCH дати народження поза 2–5 років дає 409 і дані не змінюються', async () => {
  const child = await makeChild();
  const res = await call('PATCH', `/children/${child.id}`, { birthDate: birthFor(8) });
  assert.equal(res.status, 409);

  const after = await call('GET', `/children/${child.id}`);
  assert.equal(after.body.birthDate, child.birthDate);
});

test('children + groups: вік має збігатися з групою, група має існувати', async () => {
  const group = await makeGroup({ age: 3 });

  const match = await makeChild({ birthDate: birthFor(3), groupId: group.id });
  assert.equal(match.groupId, group.id);

  const wrongAge = await call('POST', '/children', {
    name: 'Тест',
    birthDate: birthFor(4),
    groupId: group.id,
  });
  assert.equal(wrongAge.status, 409);

  const noGroup = await call('POST', '/children', {
    name: 'Тест',
    birthDate: birthFor(3),
    groupId: MISSING_ID,
  });
  assert.equal(noGroup.status, 404);

  const free = await makeChild({ birthDate: birthFor(4) });
  const move = await call('PATCH', `/children/${free.id}`, { groupId: group.id });
  assert.equal(move.status, 409);
});

test('children + groups: ліміт групи, звільнене місце знову доступне', async () => {
  const group = await makeGroup({ age: 3, limit: 1 });
  const first = await makeChild({ groupId: group.id });

  const full = await call('POST', '/children', {
    name: 'Другий',
    birthDate: birthFor(3),
    groupId: group.id,
  });
  assert.equal(full.status, 409);

  assert.equal((await call('DELETE', `/children/${first.id}`)).status, 200);
  created.children = created.children.filter((id) => id !== first.id);

  await makeChild({ groupId: group.id });
});

// ---------- Рахунок ----------

// [вік, пільга, період, навчання зі знижкою, харчування, разом] при цінах 15000 / 300-600 / 10-20-30 / 12%
const INVOICE_TABLE = [
  [2, 'none', 'month', 15000, 6600, 21600],
  [2, 'none', 'year', 158400, 79200, 237600],
  [2, 'min', 'month', 13500, 6600, 20100],
  [2, 'min', 'year', 142560, 79200, 221760],
  [2, 'medium', 'month', 12000, 6600, 18600],
  [2, 'medium', 'year', 126720, 79200, 205920],
  [2, 'max', 'month', 10500, 6600, 17100],
  [2, 'max', 'year', 110880, 79200, 190080],
  [3, 'none', 'month', 15000, 8800, 23800],
  [3, 'none', 'year', 158400, 105600, 264000],
  [3, 'min', 'month', 13500, 8800, 22300],
  [3, 'min', 'year', 142560, 105600, 248160],
  [3, 'medium', 'month', 12000, 8800, 20800],
  [3, 'medium', 'year', 126720, 105600, 232320],
  [3, 'max', 'month', 10500, 8800, 19300],
  [3, 'max', 'year', 110880, 105600, 216480],
  [4, 'none', 'month', 15000, 11000, 26000],
  [4, 'none', 'year', 158400, 132000, 290400],
  [4, 'min', 'month', 13500, 11000, 24500],
  [4, 'min', 'year', 142560, 132000, 274560],
  [4, 'medium', 'month', 12000, 11000, 23000],
  [4, 'medium', 'year', 126720, 132000, 258720],
  [4, 'max', 'month', 10500, 11000, 21500],
  [4, 'max', 'year', 110880, 132000, 242880],
  [5, 'none', 'month', 15000, 13200, 28200],
  [5, 'none', 'year', 158400, 158400, 316800],
  [5, 'min', 'month', 13500, 13200, 26700],
  [5, 'min', 'year', 142560, 158400, 300960],
  [5, 'medium', 'month', 12000, 13200, 25200],
  [5, 'medium', 'year', 126720, 158400, 285120],
  [5, 'max', 'month', 10500, 13200, 23700],
  [5, 'max', 'year', 110880, 158400, 269280],
];

test('invoice: таблиця вік × пільга × період (знижки лише на навчання)', async () => {
  const childByKey = new Map();

  for (const [age, benefit, period, tuitionPaid, meals, total] of INVOICE_TABLE) {
    const key = `${age}:${benefit}`;
    if (!childByKey.has(key)) {
      childByKey.set(key, await makeChild({ birthDate: birthFor(age), benefitType: benefit }));
    }
    const child = childByKey.get(key);

    const res = await call('GET', `/children/${child.id}/invoice?period=${period}`);
    const label = `вік ${age}, пільга ${benefit}, ${period}`;
    assert.equal(res.status, 200, label);

    const months = period === 'year' ? 12 : 1;
    const item = (name) => res.body.items.find((i) => i.name === name).amount;

    assert.equal(res.body.period, period, label);
    assert.equal(res.body.months, months, label);
    assert.equal(item('tuition'), 15000 * months, `${label}: навчання без знижок`);
    assert.equal(item('meals'), meals, `${label}: харчування без знижок`);
    assert.equal(res.body.subtotal, 15000 * months + meals, label);
    assert.equal(res.body.discounts.discountAmount, 15000 * months - tuitionPaid, `${label}: знижка`);
    assert.equal(res.body.total, total, `${label}: разом`);
  }
});

test('invoice: без period рахується місяць; pільги й відсотки відображені в discounts', async () => {
  const child = await makeChild({ birthDate: birthFor(4), benefitType: 'medium' });
  const res = await call('GET', `/children/${child.id}/invoice`);
  assert.equal(res.status, 200);
  assert.equal(res.body.period, 'month');
  assert.equal(res.body.total, 23000);
  assert.equal(res.body.discounts.benefitPercent, 0.2);
  assert.equal(res.body.discounts.yearlyPercent, 0);

  const year = await call('GET', `/children/${child.id}/invoice?period=year`);
  assert.equal(year.body.discounts.yearlyPercent, 0.12);
});

test('invoice: неіснуюча дитина 404, поганий period або id 400', async () => {
  const child = await makeChild();
  assert.equal((await call('GET', `/children/${MISSING_ID}/invoice`)).status, 404);
  assert.equal((await call('GET', `/children/${child.id}/invoice?period=week`)).status, 400);
  assert.equal((await call('GET', '/children/abc/invoice')).status, 400);
  assert.equal((await call('GET', '/children/-1/invoice')).status, 400);
});

// ---------- Оплати ----------

test('payments: сервер сам рахує суму, знімок містить items і discounts', async () => {
  const child = await makeChild({ birthDate: birthFor(4), benefitType: 'medium' });
  const invoice = await call('GET', `/children/${child.id}/invoice`);

  const payment = await makePayment({ childId: child.id, periodStart: '2026-11' });
  assert.equal(payment.childId, child.id);
  assert.equal(payment.amount, invoice.body.total);
  assert.equal(payment.amount, 23000);
  assert.equal(payment.period, 'month');
  assert.equal(payment.periodStart, '2026-11');
  assert.deepEqual(payment.items, invoice.body.items);
  assert.deepEqual(payment.discounts, invoice.body.discounts);

  const got = await call('GET', `/payments/${payment.id}`);
  assert.equal(got.status, 200);
  assert.equal(got.body.amount, 23000);
});

test('payments: сума з клієнта ігнорується, період year, periodStart за датою оплати', async () => {
  const child = await makeChild({ birthDate: birthFor(4), benefitType: 'medium' });

  const forged = await makePayment({ childId: child.id, amount: 1, period: 'year', date: '2026-09-15T10:00:00.000Z' });
  assert.equal(forged.amount, 258720);
  assert.equal(forged.period, 'year');
  assert.equal(forged.periodStart, '2026-09');
  assert.equal(forged.date, '2026-09-15T10:00:00.000Z');
});

test('payments: невалідні дані 400, неіснуюча дитина 404', async () => {
  const child = await makeChild();
  const bad = [
    {},
    { childId: 'abc' },
    { childId: -5 },
    { childId: child.id, period: 'week' },
    { childId: child.id, periodStart: '2026-13' },
    { childId: child.id, periodStart: '11.2026' },
    { childId: child.id, date: 'не дата' },
  ];
  for (const body of bad) {
    const res = await call('POST', '/payments', body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal((await call('POST', '/payments', { childId: MISSING_ID })).status, 404);
});

test('payments: список з фільтром childId, читання та видалення', async () => {
  const a = await makeChild();
  const b = await makeChild();
  const pa = await makePayment({ childId: a.id });
  await makePayment({ childId: b.id });

  const all = await call('GET', '/payments');
  assert.equal(all.status, 200);
  assert.ok(all.body.length >= 2);

  const only = await call('GET', `/payments?childId=${a.id}`);
  assert.equal(only.status, 200);
  assert.ok(only.body.length >= 1);
  assert.ok(only.body.every((p) => p.childId === a.id));

  assert.equal((await call('GET', '/payments?childId=abc')).status, 400);
  assert.equal((await call('GET', `/payments/${MISSING_ID}`)).status, 404);
  assert.equal((await call('GET', '/payments/abc')).status, 400);

  assert.equal((await call('DELETE', `/payments/${pa.id}`)).status, 200);
  created.payments = created.payments.filter((id) => id !== pa.id);
  assert.equal((await call('GET', `/payments/${pa.id}`)).status, 404);
  assert.equal((await call('DELETE', `/payments/${pa.id}`)).status, 404);
});

test('children + payments: дитину з оплатами не можна видалити (409), після видалення оплат можна', async () => {
  const child = await makeChild();
  const payment = await makePayment({ childId: child.id });

  const blocked = await call('DELETE', `/children/${child.id}`);
  assert.equal(blocked.status, 409);
  assert.equal((await call('GET', `/children/${child.id}`)).status, 200);

  assert.equal((await call('DELETE', `/payments/${payment.id}`)).status, 200);
  created.payments = created.payments.filter((id) => id !== payment.id);

  assert.equal((await call('DELETE', `/children/${child.id}`)).status, 200);
  created.children = created.children.filter((id) => id !== child.id);
});

// ---------- Ціни ----------

test('pricing: нові ціни діють на нові рахунки, старі оплати зберігають знімок', async () => {
  const child = await makeChild({ birthDate: birthFor(4), benefitType: 'medium' });
  const oldPayment = await makePayment({ childId: child.id });
  assert.equal(oldPayment.amount, 23000);

  const historyBefore = await call('GET', '/settings/prices/history');
  assert.equal(historyBefore.status, 200);

  const put = await call('PUT', '/settings/prices', { tuitionMonthly: 17000 });
  assert.equal(put.status, 200);
  assert.equal(put.body.tuitionMonthly, 17000);

  // 17000 * 0.8 + 500 * 22 = 24600
  const invoice = await call('GET', `/children/${child.id}/invoice`);
  assert.equal(invoice.body.total, 24600);

  const newPayment = await makePayment({ childId: child.id });
  assert.equal(newPayment.amount, 24600);

  const old = await call('GET', `/payments/${oldPayment.id}`);
  assert.equal(old.body.amount, 23000, 'старий платіж не перераховується');

  const historyAfter = await call('GET', '/settings/prices/history');
  assert.equal(historyAfter.body.length, historyBefore.body.length + 1);
  assert.equal(historyAfter.body[0].after.tuitionMonthly, 17000);
  assert.equal(historyAfter.body[0].before.tuitionMonthly, 15000);

  // повернення цін
  await call('PUT', '/settings/prices', { tuitionMonthly: 15000 });
  const back = await call('GET', `/children/${child.id}/invoice`);
  assert.equal(back.body.total, 23000);
});

test('pricing: невалідні ціни відхиляються і не змінюють налаштування', async () => {
  const before = await call('GET', '/settings/prices');
  const bad = [
    {},
    { tuitionMonthly: -1 },
    { tuitionMonthly: 'багато' },
    { benefitPercent: { LEVEL_1: 101 } },
    { benefitPercent: { LEVEL_9: 10 } },
    { mealsPerDayByAge: { 7: 100 } },
    { annualPaymentPercent: -5 },
    { tuitionPerMonth: 16000 },
  ];
  for (const body of bad) {
    const res = await call('PUT', '/settings/prices', body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  const after = await call('GET', '/settings/prices');
  assert.deepEqual(after.body, before.body);
});

// ---------- Історія змін ----------

test('history: створення й видалення дитини та оплати потрапляють у журнал', async () => {
  const child = await makeChild();
  const payment = await makePayment({ childId: child.id });

  const childHistory = await call('GET', `/history?entity=child&entityId=${child.id}`);
  assert.equal(childHistory.status, 200);
  assert.ok(childHistory.body.items.some((i) => i.action === 'create'));

  const paymentHistory = await call('GET', `/history?entity=payment&entityId=${payment.id}`);
  assert.equal(paymentHistory.status, 200);
  assert.ok(paymentHistory.body.items.some((i) => i.action === 'create'));

  await call('PATCH', `/children/${child.id}`, { name: 'Змінене Ім\'я' });
  const afterPatch = await call('GET', `/history?entity=child&entityId=${child.id}`);
  assert.ok(afterPatch.body.items.some((i) => i.action === 'update'));

  assert.equal((await call('DELETE', `/payments/${payment.id}`)).status, 200);
  created.payments = created.payments.filter((id) => id !== payment.id);
  assert.equal((await call('DELETE', `/children/${child.id}`)).status, 200);
  created.children = created.children.filter((id) => id !== child.id);

  const afterDelete = await call('GET', `/history?entity=child&entityId=${child.id}`);
  assert.ok(afterDelete.body.items.some((i) => i.action === 'delete'));
});
