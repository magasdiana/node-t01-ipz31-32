import { paymentsService } from "./payments.service.js";

export const paymentsController = {
  list: async (req, res, next) => {
    try {
      const { childId } = req.validated.query;
      res.json(await paymentsService.getPayments(childId));
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const { id } = req.validated.params;
      res.json(await paymentsService.getById(id));
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const body = req.validated.body;
      res.status(201).json(await paymentsService.createPayment(body));
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const { id } = req.validated.params;
      res.json(await paymentsService.delete(id));
    } catch (err) {
      next(err);
    }
  },
};