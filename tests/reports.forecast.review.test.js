
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcProfit,
  calculateForecast,
  findOptimum,
} from '../src/modules/reports/reports.calc.js';

test('calcProfit враховує харчування у витратах', () => {
  const result = calcProfit({
    revenue: 300000,
    expenses: {
      rooms: 50000,
      salaries: 80000,
      allowances: 79000,
      meals: 8800,
    },
  });

  assert.equal(result.totalExpenses, 217800);
  assert.equal(result.profit, 82200);
});

test('findOptimum не залежить від початкового порядку груп', () => {
  const params = {
    netRevenuePerChild: 15000,
    perRoomCost: 130000,
    fixedCosts: 680000,
    maxRooms: 3,
  };

  const first = findOptimum({
    ...params,
    groupSizes: [5, 20, 10],
  });

  const second = findOptimum({
    ...params,
    groupSizes: [20, 10, 5],
  });

  assert.deepEqual(first, second);
});

test('forecast використовує вік 3 роки без профілю', () => {
  const result = calculateForecast({
    groupSizes: [1],
    profiles: [[]],
    prices: {
      tuitionMonthly: 15000,
      mealsPerDayByAge: { 3: 400, 4: 500 },
      benefitPercent: { NONE: 0 },
    },
    months: 1,
    fixedCosts: 0,
    roomCost: 0,
    educatorSalary: 0,
    assistantSalary: 0,
    bonusRules: null,
    workingDays: 22,
    maxRooms: 1,
  });

  assert.equal(result.breakdown.tuitionRevenue, 15000);
  assert.equal(result.breakdown.mealsRevenue, 8800);
  assert.equal(result.breakdown.expenses.meals, 8800);
  assert.equal(result.total.profit, 15000);
});

test('forecast і findOptimum узгоджують прибуток', () => {
  const result = calculateForecast({
    groupSizes: [20, 20],
    profiles: [[], []],
    prices: {
      tuitionMonthly: 15000,
      mealsPerDayByAge: { 3: 400 },
      benefitPercent: { NONE: 0 },
    },
    months: 1,
    fixedCosts: 680000,
    roomCost: 50000,
    educatorSalary: 40000,
    assistantSalary: 40000,
    bonusRules: null,
    workingDays: 22,
    maxRooms: 2,
  });

  assert.equal(
    result.optimum.table[1].profit,
    result.months[0].profit
  );
});
