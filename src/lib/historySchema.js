import { randomUUID } from "node:crypto";
import { z } from "zod";

const snapshot = z.record(z.string(), z.unknown());

// Структура JSON-запису історії (форма узгоджена з API історії Дениса)
export const historyEntrySchema = z
  .object({
    entity: z.string().min(1), // child, group, priceSettings
    entityId: z.number().int(),
    action: z.enum(["create", "update", "upsert", "delete"]),
    changes: z.object({
      before: snapshot.nullable(),
      after: snapshot.nullable(),
    }),
    changedFields: z.array(z.string()).optional(),
    createdAt: z.iso.datetime(),
    requestId: z.string().min(1),
    actor: z.object({ id: z.number().int(), role: z.string() }).nullable(),
    source: z.enum(["api", "seed"]),
  })
  .refine(
    (v) => {
      const { before, after } = v.changes;
      if (v.action === "create") return before === null && after !== null;
      if (v.action === "delete") return before !== null && after === null;
      if (v.action === "update") return before !== null && after !== null;
      return after !== null; // upsert: before може бути null
    },
    { message: "changes.before і changes.after не відповідають action" },
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

// Prisma віддає Child, ми пишемо child; PriceSettings стає priceSettings
export function entityName(model) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

// Збирає і перевіряє запис історії. before/after: повний стан запису або null.
export function buildHistoryEntry({ model, operation, before, after, context = {} }) {
  const maskedBefore = before ? maskSensitive(before) : null;
  const maskedAfter = after ? maskSensitive(after) : null;
  const entry = {
    entity: entityName(model),
    entityId: (after ?? before)?.id, // для delete id беремо зі знімка «до»
    action: operation,
    changes: { before: maskedBefore, after: maskedAfter },
    changedFields:
      operation === "update" || operation === "upsert" ? changedFields(maskedBefore, maskedAfter) : [],
    createdAt: new Date().toISOString(),
    requestId: context.requestId ?? randomUUID(),
    actor: context.actor ?? null,
    source: context.source ?? "api",
  };
  return historyEntrySchema.parse(entry);
}