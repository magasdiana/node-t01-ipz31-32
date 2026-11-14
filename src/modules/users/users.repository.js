import { prisma } from "../../lib/prisma.js";
import { withRequestContext } from "../../lib/requestContextTransaction.js";

export const usersRepository = {
  // Отримати всіх користувачів
  list() {
    return prisma.user.findMany({ orderBy: { id: "asc" } });
  },

  // Отримати користувача за ID
  getById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  // Знайти за логіном (логін зберігається в data.login, у нижньому регістрі)
  findByLogin(login) {
    return prisma.user.findFirst({
      where: { data: { path: ["login"], equals: login } },
    });
  },

  // Створити користувача. Через withRequestContext, щоб в історію потрапив actor
  create(data) {
    return withRequestContext((tx) => tx.user.create({ data }));
  },
};
