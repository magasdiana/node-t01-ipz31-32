// Передає помилки async-контролерів у errorHandler (Express 5 і так це робить,
// але явна обгортка робить код зрозумілим і не залежить від версії)
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
