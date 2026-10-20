import { z } from "zod";

// schema: z.object({ body?, params?, query? })
// Результат кладе в req.validated. req.body/params/query не змінює,
// бо в Express 5 req.query є лише для читання.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });
  if (!result.success) return next(result.error);
  req.validated = result.data;
  next();
};
