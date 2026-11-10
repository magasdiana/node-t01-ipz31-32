
/**
 * Відновлює стан сутності на заданий момент часу.
 */
export function stateAt(entries, at) {
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const targetTime = new Date(at).getTime();

  const validEntries = entries.filter((entry) => {
    const entryTime = new Date(entry.data?.createdAt).getTime();

    return entryTime <= targetTime;
  });

  if (validEntries.length === 0) {
    return null;
  }

  const latestEntry = validEntries[validEntries.length - 1];
  const action = latestEntry.data?.action;

  if (action === "delete") {
    return null;
  }

  return latestEntry.data?.changes?.after || null;
}
