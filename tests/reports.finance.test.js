import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateForecast,
  calcGroupBonuses,
  calcProfit,
  findOptimum,
  minRooms,
} from '../src/modules/reports/reports.calc.js';

import {
  DEFAULT_PRICES,
  GROUP_BONUS_RULES,
  ROOM,
  SALARY,
  ASSUMPTIONS,
} from '../src/config/constants.js';

const fixedCosts = 680000;

function forecast(groupSizes, profiles, months = 3) {
  return calculateForecast({
    groupSizes,
    profiles,
    prices: DEFAULT_PRICES,
    months,
    fixedCosts,
    roomCost: ROOM.ROOM_COST_DEFAULT,
    educatorSalary: SALARY.EDUCATOR_BASE,
    assistantSalary: SALARY.ASSISTANT_BASE,
    bonusRules: GROUP_BONUS_RULES,
    workingDays: ASSUMPTIONS.A1_WORKING_DAYS_PER_MONTH,
    maxRooms: 50,
  });
}

// 1. Перевірка бонусів персоналу

test('Finance: бонуси для 11, 12, 13, 14 та 20 дітей', () => {
  const cases = [
    [11, 0],
    [12, 15000],
    [13, 23000],
    [14, 31000],
    [20, 79000],
  ];

  for (const [children, expected] of cases) {
    assert.equal(
      calcGroupBonuses(children, GROUP_BONUS_RULES),
      expected
    );
  }
});

// 2. Контрольний сценарій BA

test('Finance: контрольний прогноз BA на 3 місяці', () => {
  const result = forecast(
    [15, 12, 18],
    [
      Array.from({ length: 15 }, () => ({
        age: 3,
        benefitType: 'min',
      })),

      Array.from({ length: 12 }, () => ({
        age: 4,
        benefitType: 'medium',
      })),

      Array.from({ length: 18 }, () => ({
        age: 5,
        benefitType: 'medium',
      })),
    ]
  );

  assert.equal(result.breakdown.tuitionRevenue, 562500);
  assert.equal(result.breakdown.mealsRevenue, 501600);

  assert.equal(result.breakdown.expenses.rooms, 150000);
  assert.equal(result.breakdown.expenses.salaries, 240000);
  assert.equal(result.breakdown.expenses.allowances, 117000);
  assert.equal(result.breakdown.expenses.meals, 501600);
  assert.equal(result.breakdown.expenses.fixed, 680000);

  assert.equal(result.months.length, 3);

  for (const month of result.months) {
    assert.equal(month.revenue, 1064100);
    assert.equal(month.costs, 1688600);
    assert.equal(month.profit, -624500);
  }

  assert.equal(result.total.revenue, 3192300);
  assert.equal(result.total.costs, 5065800);
  assert.equal(result.total.profit, -1873500);
});

// 3. Регресійна перевірка BUG-003

test('Finance: точка беззбитковості становить 8 груп', () => {
  const result = minRooms({
    childrenPerRoom: 20,
    netRevenuePerChild: DEFAULT_PRICES.tuitionMonthly,
    perRoomCost:
      ROOM.ROOM_COST_DEFAULT +
      SALARY.EDUCATOR_BASE +
      SALARY.ASSISTANT_BASE,
    fixedCosts,
    bonusRules: GROUP_BONUS_RULES,
  });

  assert.equal(result.margin, 91000);
  assert.equal(result.rooms, 8);

  assert.equal(result.margin * 7 - fixedCosts, -43000);
  assert.equal(result.margin * 8 - fixedCosts, 48000);
});

// 4. Регресійна перевірка BUG-005

test('Finance: харчування входить у загальні витрати', () => {
  const result = calcProfit({
    revenue: 25900,
    expenses: {
      rooms: 200000,
      salaries: 1000000,
      allowances: 0,
      meals: 9900,
    },
  });

  assert.equal(result.totalExpenses, 1209900);
  assert.equal(result.profit, -1184000);
});

// 5. FR-32: прибуток продовжує зростати

test('FR-32: 8 повних груп без точки плато', () => {
  const result = forecast(
    Array(8).fill(20),
    [],
    1
  );

  assert.equal(result.months[0].profit, 48000);
  assert.equal(result.optimum.maxProfit, 48000);
  assert.equal(result.optimum.bestRooms, 8);
  assert.equal(result.optimum.bestChildren, 160);
  assert.equal(result.optimum.plateauRooms, null);
});

// 6. FR-32: прибуток перестає зростати

test('FR-32: визначення точки плато та максимуму', () => {
  const result = findOptimum({
    groupRows: [
      { children: 20, margin: 91000 },
      { children: 18, margin: 77000 },
      { children: 10, margin: 0 },
      { children: 5, margin: -55000 },
    ],
    fixedCosts,
  });

  assert.equal(result.maxProfit, -512000);
  assert.equal(result.bestRooms, 2);
  assert.equal(result.bestChildren, 38);
  assert.equal(result.plateauRooms, 2);
});

// 7. FR-32: прибуток починає зменшуватися

test('FR-32: зменшення прибутку після відкриття групи', () => {
  const result = forecast(
    [20, 18, 5],
    [],
    1
  );

  assert.equal(result.optimum.bestRooms, 2);
  assert.equal(result.optimum.bestChildren, 38);
  assert.equal(result.optimum.maxProfit, -512000);
  assert.equal(result.optimum.plateauRooms, 2);
  assert.equal(result.months[0].profit, -567000);
});