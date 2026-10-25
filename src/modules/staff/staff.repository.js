import { prisma } from "../../lib/prisma.js";

export const staffRepository = {
  async findAll() {
    return prisma.staff.findMany({
      include: { staffSubjects: true },
      orderBy: { id: "asc" },
    });
  },

  async findById(id) {
    return prisma.staff.findUnique({
      where: { id: Number(id) },
      include: { staffSubjects: true },
    });
  },

  async create(data, groupId) {
    return prisma.staff.create({
      data: {
        data,
        groupId: groupId ? Number(groupId) : null,
      },
    });
  },

  async update(id, data, groupId) {
    return prisma.staff.update({
      where: { id: Number(id) },
      data: {
        data,
        groupId:
          groupId !== undefined
            ? groupId
              ? Number(groupId)
              : null
            : undefined,
      },
    });
  },

  // Видалення старих зв'язків і створення нових в одній транзакції,
  // щоб при помилці викладач не лишився без гуртків
  async setStaffSubjects(staffId, subjectIds) {
    const sid = Number(staffId);
    const ids = [...new Set((subjectIds ?? []).map(Number))];

    await prisma.$transaction([
      prisma.staffSubject.deleteMany({ where: { staffId: sid } }),
      ...(ids.length > 0
        ? [
            prisma.staffSubject.createMany({
              data: ids.map((subjectId) => ({ staffId: sid, subjectId })),
            }),
          ]
        : []),
    ]);
  },
};
