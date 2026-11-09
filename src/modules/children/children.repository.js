// The "repository" layer of the children module.

import { prisma } from "../../lib/prisma.js";
import { withRequestContext } from "../../lib/requestContextTransaction.js";

export const childrenRepository = {
  // Отримати всіх дітей
  list() {
    return prisma.child.findMany({
      orderBy: { id: "asc" },
    });
  },

  // Отримати дитину за ID
  getById(id) {
    return prisma.child.findUnique({
      where: { id },
    });
  },

  // Створити дитину
  create(data) {
    return withRequestContext((tx) =>
      tx.child.create({
        data,
      }),
    );
  },

  // Оновити дитину
  update(id, data) {
    return withRequestContext((tx) =>
      tx.child.update({
        where: { id },
        data,
      }),
    );
  },

  // Видалити дитину
  delete(id) {
    return withRequestContext((tx) =>
      tx.child.delete({
        where: { id },
      }),
    );
  },

  // Отримати кількість дітей у групі
  countByGroup(groupId, excludeChildId = null) {
    return prisma.child.count({
      where: {
        groupId,
        ...(excludeChildId !== null ? { id: { not: excludeChildId } } : {}),
      },
    });
  },
};
