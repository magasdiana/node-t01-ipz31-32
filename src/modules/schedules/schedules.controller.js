import { asyncHandler } from "../../lib/asyncHandler.js";
import * as schedulesService from "./schedules.service.js";

export const generate = asyncHandler(async (req, res) => {
  const { groupIds, save } = req.validated.body;
  const result = await schedulesService.generateSchedules({ groupIds, save });
  // 201, якщо заняття збережені; 200, якщо це лише чернетка без запису
  res.status(result.saved ? 201 : 200).json(result);
});

export const forecast = asyncHandler(async (req, res, next) => {
  try {
    const query = req.validated?.query ?? req.query;
    const result = await schedulesService.forecastSchedule(query);
    res.status(200).json(result);
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
});