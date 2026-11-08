import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const requestContextStorage = new AsyncLocalStorage();

function createEmptyContext() {
  return {
    requestId: null,
    actor: null,
    source: null,
  };
}

/**
 * Returns the context of the current asynchronous request.
 */
export function getContext() {
  const context = requestContextStorage.getStore();

  if (!context) {
    return createEmptyContext();
  }

  return {
    requestId: context.requestId,
    actor: context.actor ? { ...context.actor } : null,
    source: context.source,
  };
}

/**
 * Sets the authenticated user as the actor of the current request.
 * Only id and role are stored to prevent exposing sensitive user data.
 */
export function setActor(user) {
  const context = requestContextStorage.getStore();

  if (!context) {
    throw new Error("Cannot set actor outside an active request context");
  }

  if (user === null || user === undefined) {
    context.actor = null;
    return;
  }

  if (
    !Number.isSafeInteger(user.id) ||
    typeof user.role !== "string" ||
    !user.role
  ) {
    throw new TypeError("Actor must contain a valid numeric id and role");
  }

  context.actor = {
    id: user.id,
    role: user.role,
  };
}

/**
 * Initializes a new context for every incoming HTTP request.
 */
export function requestContextMiddleware(_req, res, next) {
  const context = {
    requestId: randomUUID(),
    actor: null,
    source: "api",
  };

  res.setHeader("X-Request-Id", context.requestId);

  requestContextStorage.run(context, next);
}
