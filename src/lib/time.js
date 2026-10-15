// Час занять у форматі HH:MM, перевірка накладок (FR-19)

export function toMinutes(hhmm) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) throw new Error(`Некоректний час: ${hhmm}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export function toHHMM(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Півінтервали [start, end): 09:00–09:30 і 09:30–10:00 не накладаються
export function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

// Перевірка, чи вкладається заняття у слот розкладу (з SCHEDULE.* у constants)
export function lessonEnd(startHHMM, durationMinutes) {
  return toMinutes(startHHMM) + durationMinutes;
}
