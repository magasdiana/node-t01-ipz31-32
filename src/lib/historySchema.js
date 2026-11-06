import { z } from "zod";

const snapshot = z.record(z.string(), z.unknown());

// Структура JSON-запису історії (перевіряється перед кожним записом)
export const historyEntrySchema = z
  .object({
    entity: z.string().min(1),
    entityId: z.union([z.number().int(), z.string().min(1)]),
    action: z.enum(["create", "update", "delete"]),
    before: snapshot.nullable(),
    after: snapshot.nullable(),
    changedFields: z.array(z.string()),
    actor: z.object({ id: z.number().int(), role: z.string() }).nullable(),
    source: z.enum(["api", "seed"]),
    requestId: z.string().min(1),
    changedAt: z.iso.datetime(),
  })
  .refine(
    (v) =>
      (v.action === "create" && v.before === null && v.after !== null) ||
      (v.action === "delete" && v.before !== null && v.after === null) ||
      (v.action === "update" && v.before !== null && v.after !== null),
    { message: "before і after не відповідають action" },
  );

export const SENSITIVE_KEYS = ["passwordHash", "password", "token"];

// Маскує чутливі поля у знімку (на будь-якій глибині)
export function maskSensitive(value) {
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE_KEYS.includes(k) ? "***" : maskSensitive(v)]),
    );
  }
  return value;
}

// Які поля запису змінилися (порівняння верхнього рівня)
export function changedFields(before, after) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return [...keys].filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]));
}