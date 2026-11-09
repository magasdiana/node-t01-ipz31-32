import { prisma } from "../../lib/prisma.js";
import { withRequestContext } from "../../lib/requestContextTransaction.js";

const WRITABLE = ["groupId", "subjectId", "staffId", "data"];

const pickWritable = (row) =>
  Object.fromEntries(
    WRITABLE.filter((key) => row[key] !== undefined).map((key) => [
      key,
      row[key],
    ]),
  );

export const lessonsRepository = {
  findByGroupId(groupId) {
    return prisma.lesson.findMany({
      where: { groupId },
      orderBy: { id: "asc" },
    });
  },

  findByStaffId(staffId) {
    return prisma.lesson.findMany({
      where: { staffId: Number(staffId) },
      include: { subject: true },
      orderBy: { id: "asc" },
    });
  },

  findById(id) {
    return prisma.lesson.findUnique({ where: { id } });
  },

  findAllExcept(id) {
    return prisma.lesson.findMany({
      where: { id: { not: id } },
      orderBy: { id: "asc" },
    });
  },

  create(row) {
    return withRequestContext((tx) =>
      tx.lesson.create({
        data: pickWritable(row),
      }),
    );
  },

  createMany(rows) {
    return withRequestContext((tx) =>
      tx.lesson.createMany({
        data: rows.map(pickWritable),
      }),
    );
  },

  update(id, patch) {
    return withRequestContext((tx) =>
      tx.lesson.update({
        where: { id },
        data: pickWritable(patch),
      }),
    );
  },

  async replaceForGroups(groupIds, rows) {
    if (!groupIds || groupIds.length === 0) return [];

    return withRequestContext(async (tx) => {
      await tx.lesson.deleteMany({
        where: { groupId: { in: groupIds } },
      });

      if (rows.length === 0) return [];

      return tx.lesson.createManyAndReturn({
        data: rows.map(pickWritable),
      });
    });
  },
};
