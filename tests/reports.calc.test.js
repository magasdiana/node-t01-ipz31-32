import test from 'node:test';
import assert from 'node:assert/strict';
import { calcGroupBonuses, calcProfit, minRooms, findOptimum } from '../src/modules/reports/reports.calc.js';

// Правила доплат від BA: з 12 дітей фіксовані 15000 на групу,
// з 13-ї дитини ще +5000 вихователю і +3000 помічнику за кожну
const bonusRules = {
  flatFrom: 12,
  flatAmount: 15000,
  perChildFrom: 13,
  perChildEducator: 5000,
  perChildAssistant: 3000,
};

test('calcGroupBonuses: до 11 дітей доплат немає', () => {
  assert.equal(calcGroupBonuses(11, bonusRules), 0);
});

test('calcGroupBonuses: 12 дітей це фіксовані 15000', () => {
  assert.equal(calcGroupBonuses(12, bonusRules), 15000);
});

test('calcGroupBonuses: 13 дітей це 15000 плюс 8000', () => {
  assert.equal(calcGroupBonuses(13, bonusRules), 23000);
});

test('calcGroupBonuses: 20 дітей це 15000 плюс 8 по 8000', () => {
  assert.equal(calcGroupBonuses(20, bonusRules), 79000);
});

test('calcGroupBonuses: без правил доплат немає', () => {
  assert.equal(calcGroupBonuses(20), 0);
});

test('calcProfit: виручка мінус витрати', () => {
  const r = calcProfit({
    revenue: 300000,
    expenses: { rooms: 50000, salaries: 80000, allowances: 0, meals: 0 },
  });
  assert.equal(r.totalExpenses, 130000);
  assert.equal(r.profit, 170000);
});

test('minRooms: 680000 / 170000 = 4 кімнати', () => {
  const r = minRooms({ childrenPerRoom: 20, netRevenuePerChild: 15000, perRoomCost: 130000, fixedCosts: 680000 });
  assert.equal(r.margin, 170000);
  assert.equal(r.rooms, 4);
});

test('minRooms: дробове значення округлюється вгору', () => {
  const r = minRooms({ childrenPerRoom: 20, netRevenuePerChild: 15000, perRoomCost: 130000, fixedCosts: 700000 });
  assert.equal(r.rooms, 5);
});

test('minRooms: кімната не окупається, дає null', () => {
  const r = minRooms({ childrenPerRoom: 20, netRevenuePerChild: 5000, perRoomCost: 130000, fixedCosts: 100000 });
  assert.equal(r.rooms, null);
});

test('minRooms з доплатами: маржа 91000, потрібно 8 кімнат', () => {
  const r = minRooms({
    childrenPerRoom: 20, netRevenuePerChild: 15000, perRoomCost: 130000, fixedCosts: 680000, bonusRules,
  });
  assert.equal(r.margin, 91000);
  assert.equal(r.rooms, 8);
});

test('findOptimum: найкраще 2 кімнати, далі прибуток падає', () => {
  const r = findOptimum({ groupSizes: [5, 20, 20], netRevenuePerChild: 15000, perRoomCost: 130000, fixedCosts: 100000, maxRooms: 10 });
  assert.deepEqual(r.table.map(x => x.profit), [70000, 240000, 185000]);
  assert.equal(r.bestRooms, 2);
  assert.equal(r.bestChildren, 40);
  assert.equal(r.plateauChildren, 40);
});

test('findOptimum: якщо прибуток лише росте, плато null', () => {
  const r = findOptimum({ groupSizes: [20, 20], netRevenuePerChild: 15000, perRoomCost: 130000, fixedCosts: 100000, maxRooms: 10 });
  assert.equal(r.plateauChildren, null);
});

test('findOptimum з доплатами: прибуток по кімнатах', () => {
  const r = findOptimum({
    groupSizes: [20, 20, 5], netRevenuePerChild: 15000, perRoomCost: 130000, fixedCosts: 100000, maxRooms: 10, bonusRules,
  });
  assert.deepEqual(r.table.map(x => x.profit), [-9000, 82000, 27000]);
  assert.equal(r.bestRooms, 2);
  assert.equal(r.plateauChildren, 40);
});

test('findOptimum: додатковий блок викладачів знижує прибуток', () => {
  const r = findOptimum({
    groupSizes: [20, 20, 20], netRevenuePerChild: 15000, perRoomCost: 130000, fixedCosts: 100000, maxRooms: 10,
    bonusRules, extraTeachers: { groupsPerBlock: 2, blockCost: 600000 },
  });
  assert.deepEqual(r.table.map(x => x.profit), [-9000, 82000, -427000]);
  assert.equal(r.bestRooms, 2);
  assert.equal(r.plateauChildren, 40);
});