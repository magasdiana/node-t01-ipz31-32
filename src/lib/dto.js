// Запис із БД: { id, data: {...} } -> відповідь API: { id, ...data }
// extra: поля з FK, які треба показати (наприклад, groupId)
export const toDto = (row, extra = {}) => {
  if (!row) return null;
  const { id, data, ...rest } = row;
  return { id, ...data, ...extra };
};

export const toDtoList = (rows, extraFn) =>
  rows.map((row) => toDto(row, extraFn ? extraFn(row) : {}));
