import test from 'node:test';
import assert from 'node:assert/strict';

import { reportsService } from '../src/modules/reports/reports.service.js';
import { reportsRepository } from '../src/modules/reports/reports.repository.js';

function mockScenario(t, childData) {
  t.mock.method(
    reportsRepository,
    'getGroupsWithChildrenCount',
    async () => [
      {
        id: 1,
        _count: {
          children: childData.length,
        },
      },
    ]
  );

  t.mock.method(
    reportsRepository,
    'getForecastChildren',
    async () =>
      childData.map((data, index) => ({
        id: index + 1,
        groupId: 1,
        data,
      }))
  );

  t.mock.method(
    reportsRepository,
    'getForecastPrices',
    async () => ({
      data: {
        tuitionMonthly: 16000,

        mealsPerDayByAge: {
          2: 300,
          3: 450,
          4: 500,
          5: 600,
        },

        benefitPercent: {
          NONE: 0,
          LEVEL_1: 10,
          LEVEL_2: 20,
          LEVEL_3: 30,
        },
      },
    })
  );
}

test('Forecast: підтримка старого формату пільг', async t => {
  mockScenario(t, [
    { benefit: null },
    { benefit: 'LEVEL_1' },
    { benefit: 'LEVEL_2' },
    { benefit: 'LEVEL_3' },
  ]);

  const result =
    await reportsService.getForecastProfit({
      months: 1,
    });

  assert.equal(
    result.breakdown.tuitionRevenue,
    54400
  );

  assert.equal(
    result.breakdown.mealsRevenue,
    39600
  );
});

test('Forecast: максимальна VIP-пільга', async t => {
  mockScenario(t, [
    {
      relative: {
        name: 'Test VIP',
        role: 'депутат',
      },
      benefit: null,
    },

    {
      relativeVip: true,
    },
  ]);

  const result =
    await reportsService.getForecastProfit({
      months: 1,
    });

  assert.equal(
    result.breakdown.tuitionRevenue,
    22400
  );
});

test('Forecast: benefitType має пріоритет', async t => {
  mockScenario(t, [
    {
      benefitType: 'medium',
      benefit: 'LEVEL_3',
      relativeVip: true,
    },

    {
      benefitType: 'none',
      benefit: 'LEVEL_3',
      relativeVip: true,
    },
  ]);

  const result =
    await reportsService.getForecastProfit({
      months: 1,
    });

  assert.equal(
    result.breakdown.tuitionRevenue,
    28800
  );
});

test('Forecast: актуальні ціни з БД', async t => {
  mockScenario(t, [
    { benefitType: 'none' },
  ]);

  const result =
    await reportsService.getForecastProfit({
      months: 1,
    });

  assert.equal(
    result.breakdown.tuitionRevenue,
    16000
  );

  assert.equal(
    result.breakdown.mealsRevenue,
    9900
  );

  assert.equal(
    result.breakdown.expenses.meals,
    9900
  );

  assert.equal(
    result.months[0].profit,
    -794000
  );
});