import { stateAt } from "./history.state.js";
import { toDto } from "../../lib/dto.js";
import { NotFoundError, BadRequestError } from "../../lib/errors.js";

import { historyRepository } from "./history.repository.js";
import * as groupsModule from "../groups/groups.service.js";
import * as childrenModule from "../children/children.service.js";
import { HISTORY_ENTITIES } from "./history.entities.js";

export function createHistoryService({ historyRepository, entityChecks = {} }) {
  function validateEntity(entityKey) {
    if (!HISTORY_ENTITIES.includes(entityKey)) {
      throw new BadRequestError(`Непідтримувана сутність: ${entityKey}`);
    }
  }

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

  async listForAnyEntity(entityKey, entityId, filters) {
    validateEntity(entityKey);

    return list({
      ...filters,
      entity: entityKey,
      entityId: Number(entityId),
    });
  },

  async getById(id) {
      const row = await historyRepository.findById(id);

      if (!row) {
        throw new NotFoundError("Запис історії не знайдено");
      }

      return toDto(row);
    },

    async getState() {
      const [total, last] = await Promise.all([
        historyRepository.count(),
        historyRepository.findLast(),
      ]);

      return {
        total,
        last: last ? toDto(last) : null,
      };
    },

    async listForEntity(entityKey, entityId, filters) {
      const check = entityChecks[entityKey];

      if (!check) {
        throw new Error(
          `Не налаштовано перевірку для сутності ${entityKey}`
        );
      }

      await check(entityId);

      return list({
        ...filters,
        entity: entityKey,
        entityId: Number(entityId),
      });
    },

    async getStateAt(entityKey, entityId, at) {
      validateEntity(entityKey);

      const { items } = await historyRepository.findMany({
        entity: entityKey,
        entityId: Number(entityId),
        sort: "asc",
      });

      if (!items || items.length === 0) {
        throw new NotFoundError("Сутність або її історія не знайдена");
      }

      const state = stateAt(items, at);

      if (!state) {
        throw new NotFoundError(
          "Стан сутності на вказаний момент часу не знайдено (сутність ще не існувала або вже була видалена)"
        );
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