
import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { signToken } from '../src/lib/jwt.js';

// Увімкнути JWT-авторизацію для тестів звітів.
process.env.AUTH_ENABLED = 'true';

async function withServer(callback) {
  const server = app.listen(0);

  try {
    await new Promise(resolve => {
      if (server.listening) resolve();
      else server.once('listening', resolve);
    });

    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

// Створення JWT-токена для тестового користувача.
function authHeaders(role = 'admin') {
  const token = signToken({
    id: 1,
    role,
  });

  return {
    Authorization: `Bearer ${token}`,
  };
}

// GET /reports/profit

test('GET /reports/profit повертає звіт за місяць', async () => {
  await withServer(async base => {
    const res = await fetch(
      `${base}/reports/profit?month=2026-10`,
      {
        headers: authHeaders('admin'),
      }
    );

    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.month, '2026-10');
    assert.equal(typeof data.revenue, 'number');
    assert.equal(typeof data.profit, 'number');
    assert.ok(data.expenses);
    assert.ok(Array.isArray(data.groups));
  });
});

test('GET /reports/profit без місяця', async () => {
  await withServer(async base => {
    const res = await fetch(
      `${base}/reports/profit`,
      {
        headers: authHeaders('admin'),
      }
    );

    const data = await res.json();

    const now = new Date();
    const currentMonth =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    assert.equal(res.status, 200);
    assert.equal(data.month, currentMonth);
  });
});

test('GET /reports/profit з неіснуючим groupId', async () => {
  await withServer(async base => {
    const res = await fetch(
      `${base}/reports/profit?groupId=999999`,
      {
        headers: authHeaders('admin'),
      }
    );

    assert.equal(res.status, 404);
  });
});

// GET /reports/min-rooms

test('GET /reports/min-rooms повертає BA-модель', async () => {
  await withServer(async base => {
    const res = await fetch(
      `${base}/reports/min-rooms`,
      {
        headers: authHeaders('admin'),
      }
    );

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
  });
});

// GET /reports/forecast-profit

test('GET /reports/forecast-profit: 2 групи для Admin', async () => {
  await withServer(async base => {
    const res = await fetch(
      `${base}/reports/forecast-profit?groups=2&children=20,20&months=3`,
      {
        headers: authHeaders('admin'),
      }
    );

    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.months.length, 3);
    assert.deepEqual(data.scenario.children, [20, 20]);
    assert.equal(typeof data.optimum.maxProfit, 'number');

    assert.equal(
      data.breakdown.mealsRevenue,
      data.breakdown.expenses.meals
    );
  });
});

test('GET /reports/forecast-profit: неправильний список дітей', async () => {
  await withServer(async base => {
    const res = await fetch(
      `${base}/reports/forecast-profit?groups=3&children=15,12&months=3`,
      {
        headers: authHeaders('admin'),
      }
    );

    assert.equal(res.status, 400);
  });
});

test('GET /reports/forecast-profit: без авторизації повертає 401', async () => {
  await withServer(async base => {
    const res = await fetch(
      `${base}/reports/forecast-profit?groups=2&children=20,20&months=3`
    );

    assert.equal(res.status, 401);
  });
});

test('GET /reports/forecast-profit: Parent отримує 403', async () => {
  await withServer(async base => {
    const res = await fetch(
      `${base}/reports/forecast-profit?groups=2&children=20,20&months=3`,
      {
        headers: authHeaders('parent'),
      }
    );

    assert.equal(res.status, 403);
  });
});
