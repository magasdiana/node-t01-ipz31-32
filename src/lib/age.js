import { LIMITS } from "../config/constants.js";

// Повні роки на дату on (за замовчуванням сьогодні)
export function ageInYears(birthDate, on = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const m = on.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

// FR-01: діти віком 2–5 років
export function isChildAgeAllowed(birthDate, on = new Date()) {
  const age = ageInYears(birthDate, on);
  return age >= LIMITS.CHILD_AGE_MIN && age <= LIMITS.CHILD_AGE_MAX;
}
