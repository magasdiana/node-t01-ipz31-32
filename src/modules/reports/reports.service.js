
import { reportsRepository } from './reports.repository.js';
import { NotFoundError } from '../../lib/errors.js';
import {
  DEFAULT_PRICES,
  GROUP_BONUS_RULES,
  LIMITS,
  ROOM,
  SALARY,
} from '../../config/constants.js';
import {
  calcGroupBonuses,
  calcProfit,
  minRooms,
  paymentShareForMonth,
  round2,
} from './reports.calc.js';

const BASE_SALARY = {
  educator: SALARY.EDUCATOR_BASE,
  assistant: SALARY.ASSISTANT_BASE,
  manager: SALARY.MANAGER,
  teacher: SALARY.TEACHER,
};

const MIN_ROOMS_FIXED_COSTS = 680000;

function salaryOf(member) {
  const salary = member.data?.salary;

  if (salary === undefined || salary === null || salary === '') {
    return BASE_SALARY[member.data?.position] ?? 0;
  }

  return Number(salary) || 0;
}

const sum = (list, fn) =>
  list.reduce((total, item) => total + fn(item), 0);

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function revenueForMonth(payments, month) {
  let total = 0;
  let meals = 0;

  for (const payment of payments) {
    const share = paymentShareForMonth(payment, month);
    total += share.total;
    meals += share.meals;
  }

  return { total, meals };
}

function sharedCosts(staff) {
  const shared = staff.filter((s) => !s.groupId);

  const manager = sum(
    shared.filter((s) => s.data?.position === 'manager'),
    salaryOf
  );

  const teachers = sum(
    shared.filter((s) => s.data?.position === 'teacher'),
    salaryOf
  );

  return {
    manager,
    teachers,
    total: manager + teachers,
  };
}

function roundReport(report) {
  return {
    ...report,
    revenue: round2(report.revenue),
    tuitionRevenue: round2(report.tuitionRevenue),
    mealsRevenue: round2(report.mealsRevenue),
    expenses: Object.fromEntries(
      Object.entries(report.expenses).map(([key, value]) => [
        key,
        round2(value),
      ])
    ),
    totalExpenses: round2(report.totalExpenses),
    profit: round2(report.profit),
  };
}

export const reportsService = {
  async getProfit({ month, groupId } = {}) {
    const targetMonth = month ?? currentMonth();

    const [payments, allGroups, rooms, staff] = await Promise.all([
      reportsRepository.getPayments(),
      reportsRepository.getGroupsWithChildrenCount(),
      reportsRepository.getRooms(),
      reportsRepository.getStaffWithSalaries(),
    ]);

    let groups = allGroups;

    if (groupId !== undefined) {
      const found = allGroups.find((g) => g.id === groupId);

      if (!found) {
        throw new NotFoundError('Групу не знайдено');
      }

      groups = [found];
    }

    const roomCost = new Map(
      rooms.map((r) => [
        r.id,
        Number(r.data?.cost ?? ROOM.ROOM_COST_DEFAULT) || 0,
      ])
    );

    const groupReports = groups.map((group) => {
      const children = group._count?.children ?? 0;

      const members = staff.filter(
        (s) =>
          s.groupId === group.id &&
          ['educator', 'assistant'].includes(s.data?.position)
      );

      const revenue = revenueForMonth(
        payments.filter((p) => p.child?.groupId === group.id),
        targetMonth
      );

      const expenses = {
        rooms: group.roomId ? roomCost.get(group.roomId) ?? 0 : 0,
        salaries: sum(members, salaryOf),
        allowances: calcGroupBonuses(children, GROUP_BONUS_RULES),
        meals: revenue.meals,
      };

      return roundReport({
        groupId: group.id,
        name: group.data?.name ?? null,
        children,
        tuitionRevenue: revenue.total - revenue.meals,
        mealsRevenue: revenue.meals,
        ...calcProfit({
          revenue: revenue.total,
          expenses,
        }),
      });
    });

    if (groupId !== undefined) {
      const [only] = groupReports;

      return {
        month: targetMonth,
        shared: null,
        ...only,
        groups: groupReports,
      };
    }

    const shared = sharedCosts(staff);
    const revenue = revenueForMonth(payments, targetMonth);

    const expenses = {
      rooms: sum(groupReports, (g) => g.expenses.rooms),
      salaries:
        sum(groupReports, (g) => g.expenses.salaries) + shared.total,
      allowances: sum(groupReports, (g) => g.expenses.allowances),
      meals: revenue.meals,
    };

    const overall = roundReport({
      tuitionRevenue: revenue.total - revenue.meals,
      mealsRevenue: revenue.meals,
      ...calcProfit({
        revenue: revenue.total,
        expenses,
      }),
    });

    return {
      month: targetMonth,
      ...overall,
      shared: {
        manager: round2(shared.manager),
        teachers: round2(shared.teachers),
        total: round2(shared.total),
      },
      groups: groupReports,
    };
  },

  async getMinRooms() {
    const childrenPerRoom = LIMITS.GROUP_MAX_CHILDREN;
    const netRevenuePerChild = DEFAULT_PRICES.tuitionMonthly;

    const roomCostPerRoom = ROOM.ROOM_COST_DEFAULT;
    const educatorSalary = SALARY.EDUCATOR_BASE;
    const assistantSalary = SALARY.ASSISTANT_BASE;

    const perRoomCost =
      roomCostPerRoom + educatorSalary + assistantSalary;

    const fixedCosts = MIN_ROOMS_FIXED_COSTS;

    const result = minRooms({
      childrenPerRoom,
      netRevenuePerChild,
      perRoomCost,
      fixedCosts,
      bonusRules: GROUP_BONUS_RULES,
    });

    return {
      ...result,
      model: {
        childrenPerRoom,
        netRevenuePerChild,
        perRoomCost,
        roomCostPerRoom,
        educatorSalary,
        assistantSalary,
        fixedCosts,
      },
    };
  },
};
