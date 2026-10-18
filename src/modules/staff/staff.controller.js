import { staffService } from './staff.service.js';

export const staffController = {
  async getAll(req, res, next) {
    try {
      const data = await staffService.getAll();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await staffService.getById(req.params.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await staffService.create(req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const data = await staffService.update(req.params.id, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};