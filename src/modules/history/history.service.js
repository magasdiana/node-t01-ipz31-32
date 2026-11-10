import { stateAt } from './history.state.js';
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

    async getState() {
      const [total, last] = await Promise.all([
        historyRepository.count(),
        historyRepository.findLast(),
      ]);
      return { total, last: last ? toDto(last) : null };
    },

    async listForEntity(entityKey, entityId, filters) {
      const check = entityChecks[entityKey];
      if (!check)
        throw new Error(`Не налаштовано перевірку для сутності ${entityKey}`);
      await check(entityId); // кидає 404, якщо запису немає в поточній таблиці (для списку історії активної сутності це ок)
      return list({ ...filters, entity: entityKey, entityId: Number(entityId) });
    },

    async getStateAt(entityKey, entityId, at) {
      // Перевіряємо, чи підтримується така сутність у конфізі
      const check = entityChecks[entityKey];
      if (!check) {
        throw new Error(`Не налаштовано перевірку для сутності ${entityKey}`);
      }

      // Отримуємо всі записи історії для цієї сутності, відсортовані від старих до нових
      const { items } = await historyRepository.findMany({ 
        entity: entityKey, 
        entityId: Number(entityId),
        sort: 'asc' // переконайся, що репозиторій сортує від найстаріших до найновіших, або відсортуй тут
      });

      if (!items || items.length === 0) {
        throw new NotFoundError('Сутність або її історія не знайдена');
      }

      // Проганяємо через чисту функцію stateAt
      const state = stateAt(items, at);

      if (!state) {
        throw new NotFoundError('Стан сутності на вказаний момент часу не знайдено (сутність ще не існувала або вже була видалена)');
      }

      return state;
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