import { ROOM } from "../../config/constants.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../lib/errors.js";
import { toDto, toDtoList } from "../../lib/dto.js";
import { roomsRepository } from "./rooms.repository.js";

function roomDto(row) {
  return toDto(row, {
    groupsCount: row._count?.groups ?? 0,
  });
}

function validateName(name) {
  if (typeof name !== "string" || !name.trim()) {
    throw new BadRequestError("Назва кімнати є обов'язковою");
  }
}

function validateCost(cost) {
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) {
    throw new BadRequestError("Вартість має бути невід'ємним числом");
  }
}

export const roomsService = {
  async list() {
    const rows = await roomsRepository.list();

    return toDtoList(rows, (row) => ({
      groupsCount: row._count.groups,
    }));
  },

  async getById(id) {
    const row = await roomsRepository.getById(id);

    if (!row) {
      throw new NotFoundError("Кімнату не знайдено");
    }

    return roomDto(row);
  },

  async create(input) {
    validateName(input.name);

    const cost = input.cost ?? ROOM.ROOM_COST_DEFAULT;
    validateCost(cost);

    const row = await roomsRepository.create({
      data: {
        name: input.name.trim(),
        cost,
      },
    });

    return roomDto(row);
  },

  async update(id, input) {
    const existing = await roomsRepository.getById(id);

    if (!existing) {
      throw new NotFoundError("Кімнату не знайдено");
    }

    const nextData = { ...existing.data };

    if (input.name !== undefined) {
      nextData.name = input.name;
    }

    if (input.cost !== undefined) {
      nextData.cost = input.cost;
    }

    validateName(nextData.name);
    validateCost(nextData.cost);

    const row = await roomsRepository.update(id, {
      data: {
        ...nextData,
        name: nextData.name.trim(),
      },
    });

    return roomDto(row);
  },

  async delete(id) {
    const existing = await roomsRepository.getById(id);

    if (!existing) {
      throw new NotFoundError("Кімнату не знайдено");
    }

    if (existing._count.groups > 0) {
      throw new ConflictError(
        "Не можна видалити кімнату, яка призначена групі",
      );
    }

    await roomsRepository.delete(id);

    return { message: "Кімнату видалено" };
  },
};
