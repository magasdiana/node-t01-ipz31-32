import { reportsRepository } from './reports.repository.js';
import { calcProfit, minRooms, findOptimum } from './reports.calc.js';

export const reportsService = {
  async getProfit(groupIdQuery) {
    const payments = await reportsRepository.getPayments();
    const groups = await reportsRepository.getGroupsWithChildrenCount();
    const rooms = await reportsRepository.getRooms();
    const staff = await reportsRepository.getStaffWithSalaries();


    const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const totalSalaries = staff.reduce((sum, s) => sum + (s.salary || 40000), 0);
    const totalAllowances = staff.reduce((sum, s) => sum + (s.allowance || 0), 0);
    const totalRoomsCost = rooms.reduce((sum, r) => sum + (r.cost || 0), 0);

    const expenses = {
      rooms: totalRoomsCost,
      salaries: totalSalaries,
      allowances: totalAllowances,
      meals: 0, 
    };

    const profitData = calcProfit({ revenue, expenses });

    if (groupIdQuery !== undefined) {
      const group = groups.find((g) => g.id === groupIdQuery);
      if (!group) {
        const error = new Error('Групу не знайдено');
        error.status = 404;
        throw error;
      }
      return { group, profitData };
    }

    return profitData;
  },

  async getMinRooms() {
    const payments = await reportsRepository.getPayments();
    const groups = await reportsRepository.getGroupsWithChildrenCount();
    const rooms = await reportsRepository.getRooms();
    const staff = await reportsRepository.getStaffWithSalaries();

    const totalChildren = groups.reduce((sum, g) => sum + (g._count?.children || 0), 0);
    const childrenPerRoom = groups.length > 0 ? Math.round(totalChildren / groups.length) : 10;
    const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const netRevenuePerChild = totalChildren > 0 ? revenue / totalChildren : 0;
    const perRoomCost = rooms.length > 0 ? (rooms[0].cost || 5000) : 5000;
    const fixedCosts = staff.reduce((sum, s) => sum + (s.salary || 40000) + (s.allowance || 0), 0);

    
    return minRooms({
      childrenPerRoom,
      netRevenuePerChild,
      perRoomCost,
      fixedCosts,
    });
  },
};