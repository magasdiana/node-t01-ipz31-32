import test from 'node:test';
import assert from 'node:assert/strict';
import { calcProfit, minRooms, findOptimum } from '../src/modules/reports/reports.calc.js';

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