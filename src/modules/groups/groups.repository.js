import { prisma } from "../../lib/prisma.js";

const groupInclude = {
  _count: {
    select: { children: true },
  },
};

export const groupsRepository = {
  list() {
    return prisma.group.findMany({
      include: groupInclude,
      orderBy: { id: "asc" },
    });
  },

  getById(id) {
    return prisma.group.findUnique({
      where: { id },
      include: groupInclude,
    });
  },

  create(data) {
    return prisma.group.create({
      data,
      include: groupInclude,
    });
  },

  update(id, data) {
    return prisma.group.update({
      where: { id },
      data,
      include: groupInclude,
    });
  },

  delete(id) {
    return prisma.group.delete({
      where: { id },
    });
  },

  getChildren(id) {
    return prisma.child.findMany({
      where: { groupId: id },
    });
  },

  findRoom(roomId, excludeGroupId = null) {
    return prisma.group.findFirst({
      where: {
        roomId,
        ...(excludeGroupId !== null
          ? { id: { not: excludeGroupId } }
          : {}),
      },
    });
  },

  roomExists(id) {
    return prisma.room.findUnique({
      where: { id },
      select: { id: true },
    });
  },
};
