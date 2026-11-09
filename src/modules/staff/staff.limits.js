import { ConflictError } from '../../lib/errors.js';
import { LIMITS } from '../../config/constants.js';

// Чиста функція (без бази): які гуртки вже заповнені.
// counts: Map<subjectId, скільки викладачів уже призначено>.
// Новий викладач додає +1 до кожного гуртка зі списку.
export function findOverLimit(counts, subjectIds, max) {
  return subjectIds
    .map((subjectId) => ({ subjectId, current: counts.get(subjectId) ?? 0, max }))
    .filter(({ current }) => current + 1 > max);
}

// Фабрика із залежностями, щоб тестувати без БД.
//
// FR-15: на кожен гурток базово base (3) викладачі.
// FR-16: понад base можна, але не більше base * multiplier (9) на гурток,
//        і лише якщо чистий прибуток після збільшення додатний.
//
// getProfit: async () => число, поточний чистий прибуток (до додавання викладача).
export function createTeacherLimitChecker({
  staffRepository,
  getProfit,
  base = LIMITS.TEACHERS_PER_SUBJECT,
  multiplier = LIMITS.TEACHER_MAX_MULTIPLIER,
}) {
  const hardMax = base * multiplier;

  // subjectIds: гуртки, які викладач матиме після збереження.
  // staffId: id викладача при оновленні (його власні зв'язки не рахуємо).
  // alreadyLinked: гуртки, до яких він уже прив'язаний, ліміт на них не збільшується.
  // extraSalary: скільки нового коштує цей викладач (зарплата нового співробітника;
  //   для вже існуючого 0, бо його зарплата вже входить у прибуток).
  return async function assertTeacherLimit(
    subjectIds,
    { staffId, alreadyLinked = [], extraSalary = 0 } = {},
  ) {
    const linked = new Set(alreadyLinked.map(Number));
    const toCheck = [...new Set((subjectIds ?? []).map(Number))].filter(
      (id) => !linked.has(id),
    );
    if (toCheck.length === 0) return;

    const counts = await staffRepository.countTeachersBySubject(toCheck, staffId);

    // Абсолютна межа (×3): більше не можна ніколи
    const overHard = findOverLimit(counts, toCheck, hardMax);
    if (overHard.length > 0) {
      const ids = overHard.map((o) => o.subjectId).join(', ');
      throw new ConflictError(
        `Перевищено максимум викладачів на гурток (${hardMax}). Гуртки: ${ids}`,
        overHard,
      );
    }

    // Не більше base: прибуток не перевіряємо
    const overBase = findOverLimit(counts, toCheck, base);
    if (overBase.length === 0) return;

    // Понад base (FR-16): лише за додатного прибутку після збільшення
    const profitBefore = Number(await getProfit());
    const profitAfter = profitBefore - Number(extraSalary);
    if (profitAfter > 0) return;

    const ids = overBase.map((o) => o.subjectId).join(', ');
    throw new ConflictError(
      `Понад ${base} викладачі на гурток можна лише за додатного прибутку після збільшення. Гуртки: ${ids}`,
      { subjects: overBase, profitBefore, extraSalary: Number(extraSalary), profitAfter },
    );
  };
}
