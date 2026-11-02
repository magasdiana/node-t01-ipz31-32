
import { reportsService } from './reports.service.js';

export const reportsController = {
  async getProfit(req, res, next) {
    try {
      const query = req.validated?.query ?? req.query;
      const result = await reportsService.getProfit(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getMinRooms(req, res, next) {
    try {
      const result = await reportsService.getMinRooms();
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
