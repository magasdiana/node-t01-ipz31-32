import { asyncHandler } from "../../lib/asyncHandler.js";
import * as schedulesService from "./schedules.service.js";

export const generate = asyncHandler(async (req, res) => {
  const { groupIds, save } = req.validated.body;
  const result = await schedulesService.generateSchedules({ groupIds, save });
  // 201, якщо заняття збережені; 200, якщо це лише чернетка без запису
  res.status(result.saved ? 201 : 200).json(result);
});
