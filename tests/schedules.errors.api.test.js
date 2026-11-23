// Формат помилок GET /schedules/forecast: однаковий { error: { status, message } }
// для помилок валідації (zod) і бізнес-перевірок (RangeError -> 400).
// Як і tests/schedules.forecast.api.test.js, ходить в API з реальною БД.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { signToken } from '../src/lib/jwt.js';

process.env.AUTH_ENABLED = 'true';

async function withServer(callback) {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => {
      if (server.listening) resolve();
      else server.once('listening', resolve);
    });
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

const adminHeaders = () => ({
  Authorization: `Bearer ${signToken({ id: 1, role: 'admin' })}`,
});

test('GET /schedules/forecast: помилка сценарію (21 дитина в групі) має стандартний формат помилки', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/schedules/forecast?groups=2&children=21,10`, {
      headers: adminHeaders(),
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type'), /application\/json/);
    assert.equal(body.error.status, 400);
    assert.equal(typeof body.error.message, 'string');
    assert.ok(!('details' in body.error) || body.error.details !== null);
  });
});

test('GET /schedules/forecast: помилка валідації query має той самий формат', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/schedules/forecast?groups=abc`, {
      headers: adminHeaders(),
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.error.status, 400);
    assert.equal(typeof body.error.message, 'string');
  });
});

test('GET /schedules/forecast: відповідь містить scenario і не змінює кількість занять у БД', async () => {
  await withServer(async (base) => {
    const countLessons = async () => {
      // розклад групи читає Admin; кількість береться по всіх групах
      const groups = await (await fetch(`${base}/groups`, { headers: adminHeaders() })).json();
      let total = 0;
      for (const g of groups) {
        const lessons = await (
          await fetch(`${base}/groups/${g.id}/lessons`, { headers: adminHeaders() })
        ).json();
        total += lessons.length;
      }
      return total;
    };

    const before = await countLessons();
    const res = await fetch(`${base}/schedules/forecast?groups=3&children=15,12,18`, {
      headers: adminHeaders(),
    });
    const data = await res.json();
    const after = await countLessons();

    assert.equal(res.status, 200);
    assert.equal(data.scenario.groups.length, 3);
    assert.equal(data.scenario.totalChildren, 45);
    assert.equal(after, before, 'прогноз не повинен змінювати заняття в БД');
  });
});
