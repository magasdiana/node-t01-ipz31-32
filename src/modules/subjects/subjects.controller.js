import { subjectsService } from './subjects.service.js';

export const subjectsController = {
  async getAll(req, res, next) {
    try {
      const data = await subjectsService.getAll();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await subjectsService.getById(req.params.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await subjectsService.create(req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const data = await subjectsService.update(req.params.id, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};