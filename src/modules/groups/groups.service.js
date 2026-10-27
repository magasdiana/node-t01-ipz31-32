import { LIMITS } from "../../config/constants.js";
import {
  ConflictError,
  NotFoundError,
} from "../../lib/errors.js";
import { toDto, toDtoList } from "../../lib/dto.js";
import { groupsRepository } from "./groups.repository.js";
import { ageInYears } from "../../lib/age.js";

function groupDto(row) {
  return toDto(row, {
    roomId: row.roomId,
    childrenCount: row._count?.children ?? 0,
  });
}

async function validateRoom(roomId, excludeGroupId = null) {
  if (roomId === null || roomId === undefined) return;

  const room = await groupsRepository.roomExists(roomId);

  if (!room) {
    throw new NotFoundError("Кімнату не знайдено");
  }

  const assignedGroup = await groupsRepository.findRoom(
    roomId,
    excludeGroupId,
  );

  if (assignedGroup) {
    throw new ConflictError("Ця кімната вже призначена іншій групі");
  }
}

export const groupsService = {
  async list() {
    const rows = await groupsRepository.list();

    return toDtoList(rows, (row) => ({
      roomId: row.roomId,
      childrenCount: row._count.children,
    }));
  },

  async getById(id) {
    const row = await groupsRepository.getById(id);

    if (!row) {
      throw new NotFoundError("Групу не знайдено");
    }

    return groupDto(row);
  },

  async create(input) {
    const limit = input.limit ?? LIMITS.GROUP_MAX_CHILDREN;
    const roomId = input.roomId !== undefined ? input.roomId : input.room_id;

    // Бізнес-перевірка ліміту відносно максимального значення константи
    if (limit > LIMITS.GROUP_MAX_CHILDREN) {
      throw new ConflictError(
        `У групі може бути не більше ${LIMITS.GROUP_MAX_CHILDREN} дітей`,
      );
    }

    await validateRoom(roomId);

    const row = await groupsRepository.create({
      data: {
        name: input.name.trim(),
        age: input.age,
        limit,
      },
      roomId: roomId ?? null,
    });

    return groupDto(row);
  },

  async update(id, input) {
    const existing = await groupsRepository.getById(id);

    if (!existing) {
      throw new NotFoundError("Групу не знайдено");
    }

    const nextData = { ...existing.data };

    for (const key of ["name", "age", "limit"]) {
      if (input[key] !== undefined) {
        nextData[key] = input[key];
      }
    }

    if (nextData.name) {
      nextData.name = nextData.name.trim();
    }

    if (nextData.limit && nextData.limit > LIMITS.GROUP_MAX_CHILDREN) {
      throw new ConflictError(
        `У групі може бути не більше ${LIMITS.GROUP_MAX_CHILDREN} дітей`,
      );
    }

    // Бізнес-правило: перевірка віку дітей у групі
    if (nextData.age !== undefined && nextData.age !== existing.data.age) {
      const children = await groupsRepository.getChildren(id);

      const hasDifferentAge = children.some(
        (child) => ageInYears(child.data.birthDate) !== nextData.age,
      );

      if (hasDifferentAge) {
        throw new ConflictError(
          "Не можна змінити вік групи: в ній є діти іншого віку",
        );
      }
    }

    const hasRoomId =
      input.roomId !== undefined || input.room_id !== undefined;

    const roomId = hasRoomId
      ? (input.roomId !== undefined ? input.roomId : input.room_id)
      : existing.roomId;

    if (roomId !== existing.roomId) {
      await validateRoom(roomId, id);
    }

    const row = await groupsRepository.update(id, {
      data: nextData,
      roomId: roomId ?? null,
    });

    return groupDto(row);
  },

  async delete(id) {
    const existing = await groupsRepository.getById(id);

    if (!existing) {
      throw new NotFoundError("Групу не знайдено");
    }

    try {
      await groupsRepository.delete(id);
    } catch (error) {
      if (error.code === "P2003") {
        throw new ConflictError(
          "Не можна видалити групу, до якої прив'язані діти або інші записи",
        );
      }

      throw error;
    }

    return { message: "Групу видалено" };
  },
};