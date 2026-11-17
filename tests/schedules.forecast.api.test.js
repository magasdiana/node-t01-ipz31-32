import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { signToken } from '../src/lib/jwt.js';

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

function authHeaders(role = 'admin') {
  const token = signToken({ id: 1, role });

  return {
    Authorization: `Bearer ${token}`,
  };
}

test('GET /schedules/forecast: Admin отримує прогноз', async () => {
  await withServer(async base => {
    const res = await fetch(
      `${base}/schedules/forecast?groups=3&children=15,12,18`,
      { headers: authHeaders('admin') }
    );

    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data.lessons));
    assert.ok(Array.isArray(data.unscheduled));
    assert.ok(Array.isArray(data.conflicts));
    assert.equal(data.roomsNeeded, 3);
    assert.equal(typeof data.teachersNeeded, 'number');
  });
});

test('GET /schedules/forecast: без параметрів повертає прогноз', async () => {
  await withServer(async base => {
    const res = await fetch(
      `${base}/schedules/forecast`,
      { headers: authHeaders('admin') }
    );

    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data.lessons));
    assert.ok(Array.isArray(data.unscheduled));
    assert.ok(Array.isArray(data.conflicts));
    assert.equal(typeof data.roomsNeeded, 'number');
    assert.equal(typeof data.teachersNeeded, 'number');
  });
});

test('GET /schedules/forecast: невалідні параметри повертають 400', async () => {
  const invalidQueries = [
    'groups=0',
    'groups=51',
    'groups=-1',
    'groups=abc',
    'groups=2&children=-1',
    'groups=2&children=10,abc',
    'groups=2&children=10,',
    'groups=3&children=15,12',
    'groups=2&children=21,10',
  ];

  await withServer(async base => {
    for (const query of invalidQueries) {
      const res = await fetch(
        `${base}/schedules/forecast?${query}`,
        { headers: authHeaders('admin') }
      );

      assert.equal(
        res.status,
        400,
        `Очікувався статус 400 для параметрів: ${query}`
      );
    }
  });
});

test('GET /schedules/forecast: без авторизації повертає 401', async () => {
  await withServer(async base => {
    const res = await fetch(`${base}/schedules/forecast`);

    assert.equal(res.status, 401);
  });
});
