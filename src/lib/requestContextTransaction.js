import { prisma } from "./prisma.js";
import { getContext } from "./requestContext.js";

/**
 * Passes the current request context to PostgreSQL.
 * Must be called inside an active transaction.
 */
export async function setRequestContext(tx) {
  const { requestId, actor, source } = getContext();

  const actorValue = actor ? JSON.stringify(actor) : "";

  await tx.$queryRaw`
    SELECT
      set_config('app.request_id', ${requestId ?? ""}, true),
      set_config('app.actor', ${actorValue}, true),
      set_config('app.source', ${source ?? "api"}, true)
  `;
}

/**
 * Executes database operations in a transaction
 * with the current request context.
 */
export async function withRequestContext(operation) {
  if (typeof operation !== "function") {
    throw new TypeError("withRequestContext expects a callback");
  }

  return prisma.$transaction(async (tx) => {
    await setRequestContext(tx);

    return operation(tx);
  });
}
