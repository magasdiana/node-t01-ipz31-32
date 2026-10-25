import { reportsRepository } from './reports.repository.js';
import { calcProfit, minRooms } from './reports.calc.js';

export const reportsService = {
  async getProfit(groupIdQuery) {
    const payments = await reportsRepository.getPayments();
    const groups = await reportsRepository.getGroupsWithChildrenCount();
    const rooms = await reportsRepository.getRooms();
    const staff = await reportsRepository.getStaffWithSalaries();

     
    let filteredPayments = payments;
    let filteredStaff = staff;
    let filteredRooms = rooms;

    if (groupIdQuery !== undefined) {
      const group = groups.find((g) => g.id === groupIdQuery);
      if (!group) {
        const error = new Error('Групу не знайдено');
        error.status = 404;
        throw error;
      }

      
      filteredStaff = staff.filter((s) => s.groupId === groupIdQuery);

       
      filteredPayments = payments.filter((p) => p.child?.groupId === groupIdQuery);

       
      if (group.roomId) {
        filteredRooms = rooms.filter((r) => r.id === group.roomId);
      } else {
        filteredRooms = [];
      }
    }

     
    const revenue = filteredPayments.reduce((sum, p) => sum + (Number(p.data?.amount) || 0), 0);
    
    const totalSalaries = filteredStaff.reduce((sum, s) => sum + (Number(s.data?.salary) || 40000), 0);
    const totalAllowances = filteredStaff.reduce((sum, s) => sum + (Number(s.data?.allowance) || 0), 0);
    const totalRoomsCost = filteredRooms.reduce((sum, r) => sum + (Number(r.data?.cost) || 0), 0);

    const expenses = {
      rooms: totalRoomsCost,
      salaries: totalSalaries,
      allowances: totalAllowances,
      meals: 0, 
    };

    const profitData = calcProfit({ revenue, expenses });

    if (groupIdQuery !== undefined) {
      const group = groups.find((g) => g.id === groupIdQuery);
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
    
     
    const revenue = payments.reduce((sum, p) => sum + (Number(p.data?.amount) || 0), 0);
    const netRevenuePerChild = totalChildren > 0 ? revenue / totalChildren : 0;
    
     
    const firstRoomCost = rooms.length > 0 ? Number(rooms[0].data?.cost) : NaN;
    const perRoomCost = !isNaN(firstRoomCost) ? firstRoomCost : 5000;

     
    const fixedCosts = staff.reduce((sum, s) => {
      const salary = Number(s.data?.salary) || 40000;
      const allowance = Number(s.data?.allowance) || 0;
      return sum + salary + allowance;
    }, 0);

    return minRooms({
      childrenPerRoom,
      netRevenuePerChild,
      perRoomCost,
      fixedCosts,
    });
  },
};