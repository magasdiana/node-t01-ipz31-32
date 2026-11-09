import { prisma } from "../../lib/prisma.js";
import { withRequestContext } from "../../lib/requestContextTransaction.js";

export const paymentsRepository = {
  // Створити запис оплати
  async create(childId, paymentSnapshot) {
    return withRequestContext((tx) =>
      tx.payment.create({
        data: {
          childId,
          data: paymentSnapshot,
        },
      }),
    );
  },

  // Знайти оплату за ID
  async findById(id) {
    return prisma.payment.findUnique({
      where: { id },
    });
  },

  // Видалити оплату
  async delete(id) {
    return withRequestContext((tx) =>
      tx.payment.delete({
        where: { id },
      }),
    );
  },

  // Отримати оплати з можливістю фільтрації за childId
  async findMany(where = {}) {
    return prisma.payment.findMany({
      where,
      orderBy: { id: "desc" },
    });
  },
};
