import { reportsService } from './reports.service.js';

export const reportsController = {
  async getForecastProfit(req, res, next) {
    try {
      const query = req.validated?.query ?? req.query;
      const result = await reportsService.getForecastProfit(query);
      res.json(result);
    } catch (error) {
      if (error instanceof RangeError) {
        return res.status(400).json({
          error: {
            status: 400,
            message: error.message,
            details: null,
          },
        });
      }
      next(error);
    }
  },

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