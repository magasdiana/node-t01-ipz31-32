import { prisma } from "../../lib/prisma.js";

// Рядок заняття в БД: { id, groupId, subjectId, staffId, data: { day, start, duration } }
// groupId, subjectId, staffId це FK-колонки, решта лежить у JSON-колонці data (T3, T4).
// day: число 1-5 (1 = понеділок), start: "HH:MM", duration: хвилини.

// Лишаємо тільки поля, які можна записувати: id та службові поля не передаємо в Prisma
const WRITABLE = ["groupId", "subjectId", "staffId", "data"];

const pickWritable = (row) =>
  Object.fromEntries(
    WRITABLE.filter((key) => row[key] !== undefined).map((key) => [
      key,
      row[key],
    ]),
  );

export const lessonsRepository = {
  // Усі заняття групи (масив рядків). Сортування за днем і часом робить сервіс,
  // бо day і start лежать у JSON.
  findByGroupId(groupId) {
    return prisma.lesson.findMany({
      where: { groupId },
      orderBy: { id: "asc" },
    });
  },

  // Одне заняття або null
  findById(id) {
    return prisma.lesson.findUnique({ where: { id } });
  },

  // Усі заняття, крім одного: потрібно для перевірки конфліктів при PATCH
  // (викладач і кімната перетинаються між групами, тому дивимось на весь розклад)
  findAllExcept(id) {
    return prisma.lesson.findMany({
      where: { id: { not: id } },
      orderBy: { id: "asc" },
    });
  },

  // row: { groupId, subjectId, staffId, data }. Повертає створений рядок
  create(row) {
    return prisma.lesson.create({ data: pickWritable(row) });
  },

  // Пакетне створення. rows: масив { groupId, subjectId, staffId, data }.
  // Повертає { count }, як prisma.createMany
  createMany(rows) {
    return prisma.lesson.createMany({ data: rows.map(pickWritable) });
  },

  // patch: будь-які з { groupId, subjectId, staffId, data }.
  // Якщо передаєте data, воно замінює JSON повністю, тож передавайте повний об'єкт
  update(id, patch) {
    return prisma.lesson.update({
      where: { id },
      data: pickWritable(patch),
    });
  },

  // Заміна розкладу для груп: видаляє всі заняття цих груп і створює rows.
  // Усе в одній транзакції: якщо створення впаде, старі заняття залишаться.
  // Повертає створені рядки (з id).
  async replaceForGroups(groupIds, rows) {
    if (!groupIds || groupIds.length === 0) return [];

    const remove = prisma.lesson.deleteMany({
      where: { groupId: { in: groupIds } },
    });

    if (rows.length === 0) {
      await prisma.$transaction([remove]);
      return [];
    }

    const [, created] = await prisma.$transaction([
      remove,
      prisma.lesson.createManyAndReturn({ data: rows.map(pickWritable) }),
    ]);

    return created;
  },
};
