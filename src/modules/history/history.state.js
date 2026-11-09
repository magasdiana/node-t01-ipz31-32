/**
 * Відновлює стан сутності на заданий момент часу (at) за її історією змін.
 * @param {Array} entries - Масив записів історії (відсортований від старих до нових)
 * @param {string|Date} at - Точка в часі (ISO рядок або Date)
 * @returns {Object|null} Стан об'єкта (`after`) на момент `at`, або `null`, якщо його ще не було чи він був видалений
 */
export function stateAt(entries, at) {
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const targetTime = new Date(at).getTime();

  // Фільтруємо події, які сталися до або у вказаний момент часу `at`
  const validEntries = entries.filter(entry => {
    const entryTime = new Date(entry.data?.changedAt || entry.changedAt).getTime();
    return entryTime <= targetTime;
  });

  if (validEntries.length === 0) {
    return null; // Час `at` раніше за створення запису
  }

  // Беремо найостаннішу подію з відфільтрованих
  const latestEntry = validEntries[validEntries.length - 1];
  const action = latestEntry.data?.action || latestEntry.action;

  // Якщо остання дія була 'delete' — об'єкт на цей момент був видалений
  if (action === 'delete') {
    return null;
  }

  // Повертаємо стан `after`
  return latestEntry.data?.after || latestEntry.after || null;
}