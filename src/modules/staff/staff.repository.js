import { prisma } from '../../lib/prisma.js';

export const staffRepository = {
  async findAll() {
    return prisma.staff.findMany({
      include: {
        staff_subjects: true,
      },
    });
  },

  async findById(id) {
    return prisma.staff.findUnique({
      where: { id: Number(id) },
      include: {
        staff_subjects: true,
      },
    });
  },

  async create(data, groupId) {
    return prisma.staff.create({
      data: {
        data,
        group_id: groupId ? Number(groupId) : null,
      },
    });
  },

  async update(id, data, groupId) {
    return prisma.staff.update({
      where: { id: Number(id) },
      data: {
        data,
        group_id: groupId !== undefined ? (groupId ? Number(groupId) : null) : undefined,
      },
    });
  },

  async setStaffSubjects(staffId, subjectIds) {
    // Спочатку видаляємо старі зв'язки
    await prisma.staffSubject.deleteMany({
      where: { staff_id: Number(staffId) },
    });

    // Якщо є нові ID гуртків, створюємо нові зв'язки
    if (subjectIds && subjectIds.length > 0) {
      await prisma.staffSubject.createMany({
        data: subjectIds.map((subjectId) => ({
          staff_id: Number(staffId),
          subject_id: Number(subjectId),
        })),
      });
    }
  },
};