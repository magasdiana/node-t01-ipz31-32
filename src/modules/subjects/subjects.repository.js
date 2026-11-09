import { prisma } from "../../lib/prisma.js";
import { withRequestContext } from "../../lib/requestContextTransaction.js";

export const subjectsRepository = {
  // Отримати всі предмети
  async findAll() {
    return prisma.subject.findMany();
  },

  // Знайти предмет за ID
  async findById(id) {
    return prisma.subject.findUnique({
      where: { id: Number(id) },
    });
  },

  // Створити предмет
  async create(data) {
    return withRequestContext((tx) =>
      tx.subject.create({
        data: { data },
      }),
    );
  },

  // Оновити предмет
  async update(id, data) {
    return withRequestContext((tx) =>
      tx.subject.update({
        where: { id: Number(id) },
        data: { data },
      }),
    );
  },

  // Видалити предмет
  async delete(id) {
    return withRequestContext((tx) =>
      tx.subject.delete({
        where: { id: Number(id) },
      }),
    );
  },
};
