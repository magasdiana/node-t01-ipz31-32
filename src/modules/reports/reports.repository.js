import prisma from '../../config/prisma.js';

export const reportsRepository = {
  async getPayments() {
    return await prisma.payment.findMany();
  },

  async getGroupsWithChildrenCount() {
    return await prisma.group.findMany({
      include: {
        _count: {
          select: { children: true },
        },
      },
    });
  },

  async getRooms() {
    return await prisma.room.findMany();
  },

  async getStaffWithSalaries() {
    return await prisma.staff.findMany();
  },
};