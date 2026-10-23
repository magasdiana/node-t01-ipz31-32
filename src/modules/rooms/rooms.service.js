import { ROOM } from "../../config/constants.js";
import {
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
    const cost = input.cost !== undefined ? input.cost : ROOM.ROOM_COST_DEFAULT;

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
      nextData.name = input.name.trim();
    }

    if (input.cost !== undefined) {
      nextData.cost = input.cost;
    }

    const row = await roomsRepository.update(id, {
      data: nextData,
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