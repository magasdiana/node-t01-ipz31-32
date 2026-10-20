import { subjectsRepository } from './subjects.repository.js';

export const subjectsService = {
  async getAll() {
    const items = await subjectsRepository.findAll();
    return items.map((item) => ({ id: item.id, ...item.data }));
  },

  async getById(id) {
    const item = await subjectsRepository.findById(id);
    if (!item) {
      const error = new Error('Гурток не знайдено');
      error.status = 404;
      throw error;
    }
    return { id: item.id, ...item.data };
  },

  async create(data) {
    const created = await subjectsRepository.create(data);
    return { id: created.id, ...created.data };
  },

  async update(id, data) {
    const existing = await subjectsRepository.findById(id);
    if (!existing) {
      const error = new Error('Гурток не знайдено');
      error.status = 404;
      throw error;
    }
    const updatedData = { ...existing.data, ...data };
    const updated = await subjectsRepository.update(id, updatedData);
    return { id: updated.id, ...updated.data };
  },
};