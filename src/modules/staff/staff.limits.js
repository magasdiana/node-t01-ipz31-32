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

// Фабрика із залежностями, щоб тестувати без БД (FR-15).
// max за замовчуванням = 3 викладачі на гурток; для FR-16 сюди передадуть більше.
export function createTeacherLimitChecker({
  staffRepository,
  max = LIMITS.TEACHERS_PER_SUBJECT,
}) {
  // subjectIds — гуртки, які викладач матиме після збереження.
  // staffId — id викладача при оновленні (його власні зв'язки не рахуємо).
  // alreadyLinked — гуртки, до яких він уже прив'язаний: ліміт на них не збільшується.
  return async function assertTeacherLimit(
    subjectIds,
    { staffId, alreadyLinked = [] } = {},
  ) {
    const linked = new Set(alreadyLinked.map(Number));
    const toCheck = [...new Set((subjectIds ?? []).map(Number))].filter(
      (id) => !linked.has(id),
    );
    if (toCheck.length === 0) return;

    const counts = await staffRepository.countTeachersBySubject(toCheck, staffId);
    const over = findOverLimit(counts, toCheck, max);
    if (over.length === 0) return;

    const ids = over.map((o) => o.subjectId).join(', ');
    throw new ConflictError(
      `Перевищено ліміт викладачів на гурток (максимум ${max}). Гуртки: ${ids}`,
      over,
    );
  };
}
