import { prisma } from "../../lib/prisma.js";
import { withRequestContext } from "../../lib/requestContextTransaction.js";

const roomInclude = {
  _count: {
    select: { groups: true },
  },
};

export const roomsRepository = {
  // Отримати всі кімнати
  list() {
    return prisma.room.findMany({
      include: roomInclude,
      orderBy: { id: "asc" },
    });
  },

  // Отримати кімнату за ID
  getById(id) {
    return prisma.room.findUnique({
      where: { id },
      include: roomInclude,
    });
  },

  // Створити кімнату
  create(data) {
    return withRequestContext((tx) =>
      tx.room.create({
        data,
        include: roomInclude,
      }),
    );
  },

  // Оновити кімнату
  update(id, data) {
    return withRequestContext((tx) =>
      tx.room.update({
        where: { id },
        data,
        include: roomInclude,
      }),
    );
  },

  // Видалити кімнату
  delete(id) {
    return withRequestContext((tx) =>
      tx.room.delete({
        where: { id },
      }),
    );
  },
};
