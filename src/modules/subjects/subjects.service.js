import { subjectsRepository } from './subjects.repository.js';
import {
  NotFoundError,
  ConflictError,
} from '../../lib/errors.js';

export const subjectsService = {
  async getAll() {
    const items = await subjectsRepository.findAll();
    return items.map((item) => ({ id: item.id, ...item.data }));
  },

  async getById(id) {
    const item = await subjectsRepository.findById(id);
    if (!item) {
      throw new NotFoundError('Гурток не знайдено');
    }
    return { id: item.id, ...item.data };
  },

  async create(data) {
    const cleanedData = {
      ...data,
      name: data.name.trim(),
    };
    const created = await subjectsRepository.create(cleanedData);
    return { id: created.id, ...created.data };
  },

  async update(id, data) {
    const existing = await subjectsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Гурток не знайдено');
    }
    const updatedData = {
      ...existing.data,
      ...data,
      ...(data.name !== undefined && { name: data.name.trim() }),
    };
    const updated = await subjectsRepository.update(id, updatedData);
    return { id: updated.id, ...updated.data };
  },

  async delete(id) {
    const existing = await subjectsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Гурток не знайдено');
    }

    try {
      await subjectsRepository.delete(id);
    } catch (error) {
      if (error.code === 'P2003') {
        throw new ConflictError(
          'Не можна видалити гурток, до якого прив’язані інші записи',
        );
      }
      throw error;
    }

    return { message: 'Гурток видалено' };
  },
};