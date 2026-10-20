// The "repository" layer of the children module.

import { prisma } from "../../lib/prisma.js";

export const childrenRepository = {
  list() {
    return prisma.child.findMany({
      orderBy: { id: "asc" },
    });
  },

  getById(id) {
    return prisma.child.findUnique({
      where: { id },
    });
  },

  create(data) {
    return prisma.child.create({
      data,
    });
  },

  update(id, data) {
    return prisma.child.update({
      where: { id },
      data,
    });
  },

  delete(id) {
    return prisma.child.delete({
      where: { id },
    });
  },

  countByGroup(groupId, excludeChildId = null) {
    return prisma.child.count({
      where: {
        groupId,
        ...(excludeChildId !== null
          ? { id: { not: excludeChildId } }
          : {}),
      },
    });
  },
};
