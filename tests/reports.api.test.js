
import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

test('GET /reports/profit повертає звіт за вказаний місяць', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/reports/profit?month=2026-10`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.month, '2026-10');
    assert.equal(typeof data.revenue, 'number');
    assert.equal(typeof data.profit, 'number');
    assert.ok(data.expenses);
    assert.ok(Array.isArray(data.groups));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /reports/profit без місяця повертає звіт за поточний місяць', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/reports/profit`);
    const data = await res.json();

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    assert.equal(res.status, 200);
    assert.equal(data.month, currentMonth);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /reports/profit з неіснуючим groupId повертає 404', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/reports/profit?groupId=999999`);

    assert.equal(res.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /reports/min-rooms повертає результат за BA-моделлю', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/reports/min-rooms`);
    const data = await res.json();

    assert.equal(res.status, 200);

    assert.equal(data.rooms, 8);
    assert.equal(data.margin, 91000);
    assert.equal(data.reason, null);

    assert.equal(data.model.childrenPerRoom, 20);
    assert.equal(data.model.netRevenuePerChild, 15000);
    assert.equal(data.model.roomCostPerRoom, 50000);
    assert.equal(data.model.educatorSalary, 40000);
    assert.equal(data.model.assistantSalary, 40000);
    assert.equal(data.model.perRoomCost, 130000);
    assert.equal(data.model.fixedCosts, 680000);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
