import { reportsRepository } from './reports.repository.js';
import { calcProfit, minRooms, calcGroupBonuses } from './reports.calc.js';
import { NotFoundError } from '../../lib/errors.js'; 
import * as constants from '../../config/constants.js';  

export const reportsService = {
  async getProfit(groupIdQuery, monthQuery) {
    const payments = await reportsRepository.getPayments();
    const groups = await reportsRepository.getGroupsWithChildrenCount();
    const rooms = await reportsRepository.getRooms();
    const staff = await reportsRepository.getStaffWithSalaries();

    const targetMonth = monthQuery || new Date().toISOString().slice(0, 7);

    const monthlyPayments = payments.filter((p) => {
      const paymentDate = p.data?.date || p.createdAt;
      if (!paymentDate) return false;
      return paymentDate.startsWith(targetMonth);
    });

    let filteredPayments = monthlyPayments;
    let filteredStaff = staff;
    let filteredRooms = rooms;

    if (groupIdQuery !== undefined) {
      const group = groups.find((g) => g.id === groupIdQuery);
      if (!group) {
        throw new NotFoundError('Групу не знайдено');
      }

      filteredStaff = staff.filter((s) => s.groupId === groupIdQuery);
      filteredPayments = monthlyPayments.filter((p) => p.child?.groupId === groupIdQuery);

      if (group.roomId) {
        filteredRooms = rooms.filter((r) => r.id === group.roomId);
      } else {
        filteredRooms = [];
      }
    }

    let totalRevenue = 0;
    let totalMealsRevenue = 0;

    filteredPayments.forEach((p) => {
      const amount = Number(p.data?.amount) || 0;
      const isYearly = p.data?.isYearly || false;
      const paymentAmount = isYearly ? amount / 12 : amount;
      
      totalRevenue += paymentAmount;

      if (p.data?.items && Array.isArray(p.data.items)) {
        const mealItem = p.data.items.find((item) => item.type === 'meal' || item.name === 'харчування');
        if (mealItem) {
          totalMealsRevenue += Number(mealItem.amount) || 0;
        }
      }
    });

    const bonusRules = {
      flatFrom: constants.LIMITS.BONUS_THRESHOLD_CHILDREN,
      flatAmount: 15000,
      perChildFrom: constants.LIMITS.BONUS_THRESHOLD_CHILDREN + 1,
      perChildEducator: constants.SALARY.EDUCATOR_BONUS_PER_EXTRA_CHILD,
      perChildAssistant: constants.SALARY.ASSISTANT_BONUS_PER_EXTRA_CHILD,
    };

    let totalGroupBonuses = 0;
    if (groupIdQuery !== undefined) {
      const group = groups.find((g) => g.id === groupIdQuery);
      const childrenCount = group?._count?.children || 0;
      totalGroupBonuses = calcGroupBonuses(childrenCount, bonusRules);
    } else {
      groups.forEach((g) => {
        const count = g._count?.children || 0;
        totalGroupBonuses += calcGroupBonuses(count, bonusRules);
      });
    }

    const totalSalaries = filteredStaff.reduce((sum, s) => sum + (Number(s.data?.salary) || 40000), 0);
    const totalAllowances = filteredStaff.reduce((sum, s) => sum + (Number(s.data?.allowance) || 0), 0);
    const totalRoomsCost = filteredRooms.reduce((sum, r) => sum + (Number(r.data?.cost) || 0), 0);

    const expenses = {
      rooms: totalRoomsCost,
      salaries: totalSalaries,
      allowances: totalAllowances + totalGroupBonuses,  
      meals: totalMealsRevenue,  
    };

    const profitData = calcProfit({ revenue: totalRevenue, expenses });

    if (groupIdQuery !== undefined) {
      const group = groups.find((g) => g.id === groupIdQuery);
      return { group, month: targetMonth, profitData };
    }

    return { month: targetMonth, ...profitData };
  },

  async getMinRooms() {
    const fixedCosts = 680000;
    const childrenPerRoom = 20;
    const netRevenuePerChild = 91000 / childrenPerRoom;  
    const perRoomCost = 5000;  

    const bonusRules = {
      flatFrom: constants.LIMITS.BONUS_THRESHOLD_CHILDREN,
      flatAmount: 15000,
      perChildFrom: constants.LIMITS.BONUS_THRESHOLD_CHILDREN + 1,
      perChildEducator: constants.SALARY.EDUCATOR_BONUS_PER_EXTRA_CHILD,
      perChildAssistant: constants.SALARY.ASSISTANT_BONUS_PER_EXTRA_CHILD,
    };

    return minRooms({
      childrenPerRoom,
      netRevenuePerChild,
      perRoomCost,
      fixedCosts,
      bonusRules,
    });
  },
};