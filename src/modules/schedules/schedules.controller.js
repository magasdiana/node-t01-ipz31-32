import { asyncHandler } from "../../lib/asyncHandler.js";
import { BadRequestError } from "../../lib/errors.js";
import * as schedulesService from "./schedules.service.js";

export const generate = asyncHandler(async (req, res) => {
  const { groupIds, save } = req.validated.body;
  const result = await schedulesService.generateSchedules({ groupIds, save });
  // 201, якщо заняття збережені; 200, якщо це лише чернетка без запису
  res.status(result.saved ? 201 : 200).json(result);
});

export const forecast = asyncHandler(async (req, res) => {
  const query = req.validated?.query ?? req.query;

  try {
    const result = await schedulesService.forecastSchedule(query);
    res.status(200).json(result);
  } catch (error) {
    // Некоректний сценарій (наприклад, 21 дитина в групі) -> 400 у тому самому
    // форматі { error: { status, message } }, що й в інших помилок API
    if (error instanceof RangeError) throw new BadRequestError(error.message);
    throw error;
  }
});
