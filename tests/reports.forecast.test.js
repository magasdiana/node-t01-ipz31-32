import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateForecast,
} from '../src/modules/reports/reports.calc.js';

import {
  getForecastProfitSchema,
} from '../src/modules/reports/reports.schema.js';

import {
  DEFAULT_PRICES,
  GROUP_BONUS_RULES,
} from '../src/config/constants.js';

const options = {
  groupSizes: [20, 20, 20, 20, 20, 20, 20, 20],
  profiles: [],
  prices: DEFAULT_PRICES,
  months: 3,
  fixedCosts: 680000,
  roomCost: 50000,
  educatorSalary: 40000,
  assistantSalary: 40000,
  bonusRules: GROUP_BONUS_RULES,
  workingDays: 22,
  maxRooms: 50,
};

test('forecast: 8 груп дають +48000 на місяць', () => {
  const r = calculateForecast(options);

  assert.equal(r.months.length, 3);
  assert.equal(r.months[0].profit, 48000);
  assert.equal(r.total.profit, 144000);
  assert.equal(r.optimum.bestRooms, 8);
  assert.equal(r.optimum.maxProfit, 48000);
});

test('forecast: харчування враховане окремо', () => {
  const r = calculateForecast({
    ...options,
    groupSizes: [1],
    months: 1,
  });

  assert.equal(r.breakdown.mealsRevenue, 8800);
  assert.equal(r.breakdown.expenses.meals, 8800);
  assert.equal(r.breakdown.tuitionRevenue, 15000);
  assert.equal(r.months[0].profit, -795000);
});

test('forecast: пільга діє лише на навчання', () => {
  const r = calculateForecast({
    ...options,
    groupSizes: [1],
    profiles: [[
      { age: 4, benefitType: 'medium' },
    ]],
    months: 1,
  });

  assert.equal(r.breakdown.tuitionRevenue, 12000);
  assert.equal(r.breakdown.mealsRevenue, 11000);
  assert.equal(r.breakdown.expenses.meals, 11000);
});

test('forecast: невалідні параметри відхиляються Zod', () => {
  const invalidQueries = [
    { groups: '0' },
    { groups: '51' },
    { children: '-1' },
    { children: '1,a' },
    { months: '13' },
  ];

  for (const query of invalidQueries) {
    assert.equal(
      getForecastProfitSchema.safeParse({ query }).success,
      false
    );
  }

  assert.equal(
    getForecastProfitSchema.safeParse({
      query: {
        groups: '3',
        children: '15,12,18',
        months: '3',
      },
    }).success,
    true
  );
});