// Приймає Zod-схему виду z.object({ body: ..., params: ... })
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({ body: req.body, params: req.params });
  if (!result.success) return next(result.error); // обробить errorHandler
  req.validated = result.data;
  next();
};
