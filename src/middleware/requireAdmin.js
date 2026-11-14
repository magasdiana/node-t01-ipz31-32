export function requireAdmin(req, res, next) {
  // Користувача має встановлювати перевірена
  // система авторизації, а не клієнтський заголовок.
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      error: {
        status: 401,
        message: 'Потрібна авторизація',
        details: null,
      },
    });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({
      error: {
        status: 403,
        message: 'Доступ дозволено лише адміністратору',
        details: null,
      },
    });
  }

  next();
}