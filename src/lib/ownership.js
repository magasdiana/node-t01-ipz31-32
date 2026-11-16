import { prisma } from "./prisma.js";
import { ForbiddenError, NotFoundError } from "./errors.js";
import { ROLES } from "../config/roles.js";

// FR-04: єдине поле, яке Parent може змінювати
export const PARENT_EDITABLE_FIELDS = ["preferences"];

export const isParent = (user) => user?.role === ROLES.PARENT;

const defaultDeps = {
  // діти Parent: [{ id, groupId }]
  childrenOf: (parentId) =>
    prisma.child.findMany({
      where: { parentId },
      select: { id: true, groupId: true },
    }),
  // { id, parentId } або null
  childById: (id) =>
    prisma.child.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    }),
};

export function createOwnership(deps = defaultDeps) {
  // null означає "без обмежень" (Admin, Manager, Teacher, а також вимкнена авторизація)
  async function ownedChildIds(user) {
    if (!isParent(user)) return null;
    return (await deps.childrenOf(user.id)).map((c) => c.id);
  }

  async function ownedGroupIds(user) {
    if (!isParent(user)) return null;
    const rows = await deps.childrenOf(user.id);
    return [...new Set(rows.map((c) => c.groupId).filter((g) => g != null))];
  }

  async function ownsChild(user, childId) {
    if (!isParent(user)) return true;
    const child = await deps.childById(childId);
    return Boolean(child) && child.parentId === user.id;
  }

  async function assertOwnsChild(user, childId) {
    if (!(await ownsChild(user, childId)))
      throw new NotFoundError("Дитину не знайдено");
  }

  async function assertOwnsGroup(user, groupId) {
    const ids = await ownedGroupIds(user);
    if (ids && !ids.includes(groupId))
      throw new NotFoundError("Групу не знайдено");
  }

  // Parent: у тілі PATCH лише preferences. Перевіряємо сирий body.
  function assertParentMayPatch(user, body) {
    if (!isParent(user)) return;
    const forbidden = Object.keys(body ?? {}).filter(
      (k) => !PARENT_EDITABLE_FIELDS.includes(k),
    );
    if (forbidden.length > 0) {
      throw new ForbiddenError("Parent може змінювати лише поле preferences", {
        forbidden,
      });
    }
  }

  // Залишає лише записи дітей Parent. Для інших ролей повертає список без змін.
  async function filterByChild(user, items, childIdOf) {
    const ids = await ownedChildIds(user);
    if (!ids) return items;
    const set = new Set(ids);
    return items.filter((item) => set.has(childIdOf(item)));
  }

  return {
    ownedChildIds,
    ownedGroupIds,
    ownsChild,
    assertOwnsChild,
    assertOwnsGroup,
    assertParentMayPatch,
    filterByChild,
  };
}

export const ownership = createOwnership();
