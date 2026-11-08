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

  // Скільки викладачів уже призначено на кожен із гуртків (FR-15).
  // excludeStaffId: при оновленні не рахуємо самого викладача.
  async countTeachersBySubject(subjectIds, excludeStaffId) {
    const rows = await prisma.staffSubject.groupBy({
      by: ["subjectId"],
      where: {
        subjectId: { in: subjectIds.map(Number) },
        ...(excludeStaffId !== undefined && { staffId: { not: Number(excludeStaffId) } }),
      },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.subjectId, r._count._all]));
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
