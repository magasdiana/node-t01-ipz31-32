// Єдине місце, де запис users перетворюється на відповідь API.
// Список полів явний (whitelist): passwordHash сюди потрапити не може,
// навіть якщо його додадуть у data.
export const userDto = (row) => {
  if (!row) return null;
  return { id: row.id, login: row.data.login, role: row.data.role };
};
