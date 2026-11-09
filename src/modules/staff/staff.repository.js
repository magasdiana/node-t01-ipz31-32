import { prisma } from "../../lib/prisma.js";
import { withRequestContext } from "../../lib/requestContextTransaction.js";

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
    return withRequestContext((tx) =>
      tx.staff.create({
        data: {
          data,
          groupId: groupId ? Number(groupId) : null,
        },
      }),
    );
  },

  async update(id, data, groupId) {
    return withRequestContext((tx) =>
      tx.staff.update({
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
      }),
    );
  },

  async delete(id) {
    return withRequestContext((tx) =>
      tx.staff.delete({
        where: { id: Number(id) },
      }),
    );
  },

  // Видалення старих зв'язків і створення нових в одній транзакції.
  async setStaffSubjects(staffId, subjectIds) {
    const sid = Number(staffId);
    const ids = [...new Set((subjectIds ?? []).map(Number))];

    return withRequestContext(async (tx) => {
      await tx.staffSubject.deleteMany({
        where: { staffId: sid },
      });

      if (ids.length > 0) {
        await tx.staffSubject.createMany({
          data: ids.map((subjectId) => ({
            staffId: sid,
            subjectId,
          })),
        });
      }
    });
  },
};
