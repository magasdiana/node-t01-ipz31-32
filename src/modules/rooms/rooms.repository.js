import { prisma } from "../../lib/prisma.js";

const roomInclude = {
  _count: {
    select: { groups: true },
  },
};

export const roomsRepository = {
  list() {
    return prisma.room.findMany({
      include: roomInclude,
      orderBy: { id: "asc" },
    });
  },

  getById(id) {
    return prisma.room.findUnique({
      where: { id },
      include: roomInclude,
    });
  },

  create(data) {
    return prisma.room.create({
      data,
      include: roomInclude,
    });
  },

  update(id, data) {
    return prisma.room.update({
      where: { id },
      data,
      include: roomInclude,
    });
  },

  delete(id) {
    return prisma.room.delete({
      where: { id },
    });
  },
};
