import { reportsService } from './reports.service.js';

export const reportsController = {
  async getProfit(req, res, next) {
    try {
      const groupId = req.validated?.query?.groupId ?? req.query.groupId;
      const result = await reportsService.getProfit(groupId);
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