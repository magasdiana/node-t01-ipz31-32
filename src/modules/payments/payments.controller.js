import { paymentsService } from "./payments.service.js";
import { ownership } from "../../lib/ownership.js";
import { NotFoundError } from "../../lib/errors.js";

export const paymentsController = {
  list: async (req, res, next) => {
    try {
      const { childId } = req.validated.query;
      const items = await paymentsService.getPayments(childId);
      res.json(
        await ownership.filterByChild(req.user, items, (p) => p.childId),
      );
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const { id } = req.validated.params;
      const payment = await paymentsService.getById(id);
      // чужа оплата для Parent виглядає як неіснуюча
      if (!(await ownership.ownsChild(req.user, payment.childId))) {
        throw new NotFoundError("Оплату не знайдено");
      }
      res.json(payment);
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