import { z } from "zod";
import { idParam, isoDate, isoDateTime } from "../../lib/schemas.js";

export const HISTORY_ACTIONS = ["create", "update", "upsert", "delete"];

const paging = {
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
};

const rangeOk = (q) => !q.from || !q.to || q.from <= q.to;
const rangeError = { message: "from не може бути пізніше to", path: ["to"] };

const common = {
  action: z.enum(HISTORY_ACTIONS).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  ...paging,
};

// GET /history
export const listHistorySchema = z.object({
  body: z.any(),
  params: z.object({}),
  query: z
    .object({
      entity: z.string().trim().min(1).max(50).optional(),
      entityId: z.coerce.number().int().positive().optional(),
      ...common,
    })
    .refine(rangeOk, rangeError),
});

// GET /history/:id
export const historyIdSchema = z.object({
  body: z.any(),
  params: idParam,
  query: z.object({}),
});

// GET /history/state
export const historyStateSchema = z.object({
  body: z.any(),
  params: z.object({}),
  query: z.object({
    entity: z.enum(["child", "group"]),
    entityId: z.coerce.number().int().positive(),
    at: isoDateTime,
  }),
});

// GET /children/:id/history, GET /groups/:id/history
export const entityHistorySchema = z.object({
  body: z.any(),
  params: idParam,
  query: z.object(common).refine(rangeOk, rangeError),
});
