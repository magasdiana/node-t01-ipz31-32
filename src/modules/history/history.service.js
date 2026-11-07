import { toDto } from "../../lib/dto.js";
import { NotFoundError } from "../../lib/errors.js";

import { historyRepository } from "./history.repository.js";
import * as groupsModule from "../groups/groups.service.js";
import * as childrenModule from "../children/children.service.js";

export function createHistoryService({ historyRepository, entityChecks = {} }) {
  async function list(filters) {
    const { items, total } = await historyRepository.findMany(filters);
    return {
      items: items.map((row) => toDto(row)),
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  return {
    list,

    async getById(id) {
      const row = await historyRepository.findById(id);
      if (!row) throw new NotFoundError("Запис історії не знайдено");
      return toDto(row);
    },

    // ПРИПУЩЕННЯ: що саме має повертати /history/state, треба уточнити
    async getState() {
      const [total, last] = await Promise.all([
        historyRepository.count(),
        historyRepository.findLast(),
      ]);
      return { total, last: last ? toDto(last) : null };
    },

    // entityKey збігається зі значенням data.entity у записах історії
    async listForEntity(entityKey, entityId, filters) {
      const check = entityChecks[entityKey];
      if (!check)
        throw new Error(`Не налаштовано перевірку для сутності ${entityKey}`);
      await check(entityId); // кидає 404, якщо запису немає
      return list({ ...filters, entity: entityKey, entityId });
    },
  };
}

export const historyService = createHistoryService({
  historyRepository,
  entityChecks: {
    child: (id) => childrenModule.childrenService.getById(id),
    group: (id) => groupsModule.groupsService.getById(id),
  },
});
