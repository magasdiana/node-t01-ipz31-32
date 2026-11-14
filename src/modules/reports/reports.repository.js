import { prisma } from '../../lib/prisma.js';

export const reportsRepository = {
  async getForecastChildren() {
    return prisma.child.findMany({ orderBy: { id: 'asc' } });
  },

  async getForecastPrices() {
    return prisma.priceSettings.findFirst({
      orderBy: { id: 'desc' },
    });
  },

  async getPayments() {
    return prisma.payment.findMany({
      include: {
        child: true,
      },
    });
  },

  async getGroupsWithChildrenCount() {
    return prisma.group.findMany({
      include: {
        _count: {
          select: { children: true },
        },
      },
    });
  },

  async getRooms() {
    return prisma.room.findMany();
  },

  async getStaffWithSalaries() {
    return prisma.staff.findMany();
  },
};