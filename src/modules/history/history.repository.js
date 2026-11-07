import { prisma } from "../../lib/prisma.js";

function buildWhere({ entity, entityId, action, from, to }) {
  const and = [];
  const eq = (key, value) => and.push({ data: { path: [key], equals: value } });

  if (entity !== undefined) eq("entity", entity);
  if (entityId !== undefined) eq("entityId", entityId);
  if (action !== undefined) eq("action", action);
  if (from)
    and.push({ data: { path: ["createdAt"], gte: `${from}T00:00:00.000Z` } });
  if (to)
    and.push({ data: { path: ["createdAt"], lte: `${to}T23:59:59.999Z` } });

  return and.length ? { AND: and } : {};
}

export const historyRepository = {
  async findMany(filters) {
    const where = buildWhere(filters);
    const [items, total] = await Promise.all([
      prisma.historyEntry.findMany({
        where,
        orderBy: { id: "desc" },
        skip: filters.offset,
        take: filters.limit,
      }),
      prisma.historyEntry.count({ where }),
    ]);
    return { items, total };
  },

  findById(id) {
    return prisma.historyEntry.findUnique({ where: { id } });
  },

  count() {
    return prisma.historyEntry.count();
  },

  findLast() {
    return prisma.historyEntry.findFirst({ orderBy: { id: "desc" } });
  },
};
