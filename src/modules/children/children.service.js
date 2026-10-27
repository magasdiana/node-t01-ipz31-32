import { prisma } from "../../lib/prisma.js";
import { ageInYears } from "../../lib/age.js";
import { LIMITS } from "../../config/constants.js";
import {
  ConflictError,
  NotFoundError,
} from "../../lib/errors.js";

// Обчислення віку за датою народження
function getAge(birthDate) {
  return ageInYears(birthDate);
}

// Бізнес-правило: перевірка допустимого віку дитини (потрібна поточна дата)
function assertChildAge(birthDate) {
  const age = getAge(birthDate);

  if (age < LIMITS.CHILD_AGE_MIN || age > LIMITS.CHILD_AGE_MAX) {
    throw new ConflictError(
      `Вік дитини має бути від ${LIMITS.CHILD_AGE_MIN} до ${LIMITS.CHILD_AGE_MAX} років`,
    );
  }

  return age;
}

// Перетворення старого формату seed у формат DEV 2
function normalizeChildData(data) {
  const relativeVip =
    data.relativeVip ?? Boolean(data.relative);

  let benefitType = data.benefitType;

  if (benefitType === undefined) {
    if (relativeVip) {
      benefitType = "max";
    } else if (data.benefit === "LEVEL_1") {
      benefitType = "min";
    } else if (data.benefit === "LEVEL_3") {
      benefitType = "max";
    } else {
      benefitType = "none";
    }
  }

  return {
    name: data.name ?? data.fullName,
    birthDate: data.birthDate,
    guardians: data.guardians ?? data.parents ?? [],
    relativeVip,
    preferences: data.preferences ?? "",
    benefitType,
  };
}

// Перетворення запису БД у відповідь API
function childDto(row) {
  return {
    id: row.id,
    ...normalizeChildData(row.data),
    age: getAge(row.data.birthDate),
    groupId: row.groupId,
  };
}

// Нормалізація groupId для запису в БД
function normalizeGroupId(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return Number(value);
}

// Перевірка відповідності дитини групі та наявності місць (бізнес-правила з БД)
async function validateGroup(
  groupId,
  age,
  excludeChildId = null,
  tx = prisma,
) {
  if (groupId === null || groupId === undefined) return;

  const group = await tx.group.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    throw new NotFoundError("Групу не знайдено");
  }

  if (group.data.age !== age) {
    throw new ConflictError(
      "Вік дитини має відповідати віку групи",
    );
  }

  const childrenCount = await tx.child.count({
    where: {
      groupId,
      ...(excludeChildId !== null
        ? { id: { not: excludeChildId } }
        : {}),
    },
  });

  const limit = group.data.limit ?? LIMITS.GROUP_MAX_CHILDREN;

  if (
    childrenCount >= limit ||
    childrenCount >= LIMITS.GROUP_MAX_CHILDREN
  ) {
    throw new ConflictError("У групі немає вільних місць");
  }
}

export const childrenService = {
  // Отримати всіх дітей
  async list() {
    const rows = await prisma.child.findMany({
      orderBy: { id: "asc" },
    });

    return rows.map(childDto);
  },

  // Отримати дитину за ID
  async getById(id) {
    const row = await prisma.child.findUnique({
      where: { id },
    });

    if (!row) {
      throw new NotFoundError("Дитину не знайдено");
    }

    return childDto(row);
  },

  // Створити дитину
  async create(input) {
    const age = assertChildAge(input.birthDate);
    const guardians = input.guardians ?? [];
    const relativeVip = input.relativeVip ?? false;
    const benefitType =
      input.benefitType ?? (relativeVip ? "max" : "none");

    const groupId = normalizeGroupId(
      input.groupId !== undefined ? input.groupId : input.group_id,
    );

    await validateGroup(groupId, age);

    const data = {
      name: input.name.trim(),
      birthDate: input.birthDate,
      guardians,
      relativeVip,
      preferences: input.preferences ?? "",
      benefitType,
    };

    const row = await prisma.child.create({
      data: {
        data,
        groupId,
      },
    });

    return childDto(row);
  },

  // Оновити дитину
  async update(id, input) {
    const existing = await prisma.child.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError("Дитину не знайдено");
    }

    const nextData = normalizeChildData(existing.data);

    for (const key of [
      "name",
      "birthDate",
      "guardians",
      "relativeVip",
      "preferences",
      "benefitType",
    ]) {
      if (input[key] !== undefined) {
        nextData[key] = input[key];
      }
    }

    if (nextData.name) {
      nextData.name = nextData.name.trim();
    }

    const age = assertChildAge(nextData.birthDate);

    // Якщо родич є, а тип пільги явно не передано,
    // встановлюємо max. Якщо родича прибрали — none.
    if (input.benefitType === undefined) {
      if (
        nextData.relativeVip &&
        !existing.data.relativeVip
      ) {
        nextData.benefitType = "max";
      } else if (
        !nextData.relativeVip &&
        existing.data.relativeVip
      ) {
        nextData.benefitType = "none";
      }
    }

    const hasGroupId =
      input.groupId !== undefined ||
      input.group_id !== undefined;

    const groupId = hasGroupId
      ? normalizeGroupId(
        input.groupId !== undefined
          ? input.groupId
          : input.group_id,
      )
      : existing.groupId;

    if (groupId !== existing.groupId) {
      await validateGroup(groupId, age, id);
    } else if (groupId !== null && groupId !== undefined) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        throw new NotFoundError("Групу не знайдено");
      }

      if (group.data.age !== age) {
        throw new ConflictError(
          "Вік дитини має відповідати віку групи",
        );
      }
    }

    const row = await prisma.child.update({
      where: { id },
      data: {
        data: nextData,
        groupId,
      },
    });

    return childDto(row);
  },

  // Видалити дитину
  async remove(id) {
    const existing = await prisma.child.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError("Дитину не знайдено");
    }

    try {
      await prisma.child.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === "P2003") {
        throw new ConflictError(
          "Не можна видалити дитину, для якої збережена історія платежів",
        );
      }

      throw error;
    }

    return { message: "Дитину видалено" };
  },
};