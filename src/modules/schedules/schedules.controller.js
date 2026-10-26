import { asyncHandler } from "../../lib/asyncHandler.js";
import * as schedulesService from "./schedules.service.js";

export const generate = asyncHandler(async (req, res) => {
  const { groupIds } = req.validated.body;
  const result = await schedulesService.generateSchedules({ groupIds });
  // 201, якщо заняття збережені; 200, якщо це лише чернетка без запису
  res.status(result.saved ? 201 : 200).json(result);
});
