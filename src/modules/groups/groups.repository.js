import { prisma } from "../../lib/prisma.js";
import { withRequestContext } from "../../lib/requestContextTransaction.js";

const groupInclude = {
  _count: {
    select: { children: true },
  },
};

export const groupsRepository = {
  // Отримати всі групи
  list() {
    return prisma.group.findMany({
      include: groupInclude,
      orderBy: { id: "asc" },
    });
  },

  // Отримати групу за ID
  getById(id) {
    return prisma.group.findUnique({
      where: { id },
      include: groupInclude,
    });
  },

  // Створити групу
  create(data) {
    return withRequestContext((tx) =>
      tx.group.create({
        data,
        include: groupInclude,
      }),
    );
  },

  // Оновити групу
  update(id, data) {
    return withRequestContext((tx) =>
      tx.group.update({
        where: { id },
        data,
        include: groupInclude,
      }),
    );
  },

  // Видалити групу
  delete(id) {
    return withRequestContext((tx) =>
      tx.group.delete({
        where: { id },
      }),
    );
  },

  // Отримати дітей групи
  getChildren(id) {
    return prisma.child.findMany({
      where: { groupId: id },
    });
  },

  // Перевірити зайнятість кімнати
  findRoom(roomId, excludeGroupId = null) {
    return prisma.group.findFirst({
      where: {
        roomId,
        ...(excludeGroupId !== null ? { id: { not: excludeGroupId } } : {}),
      },
    });
  },

  // Перевірити існування кімнати
  roomExists(id) {
    return prisma.room.findUnique({
      where: { id },
      select: { id: true },
    });
  },
};
