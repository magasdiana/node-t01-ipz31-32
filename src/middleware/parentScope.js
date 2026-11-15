import { ownership as defaultOwnership } from "../lib/ownership.js";

// Некоректний id пропускаємо далі: його відхилить validate (400)
const toId = (req, param) => {
  const n = Number(req.params[param]);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const guard = (fn) => (req, res, next) =>
  Promise.resolve(fn(req)).then(() => next(), next);

export function createParentScope(own = defaultOwnership) {
  return {
    // GET /children/:id, GET /children/:id/invoice
    childParam: (param = "id") =>
      guard(async (req) => {
        const id = toId(req, param);
        if (id !== null) await own.assertOwnsChild(req.user, id);
      }),

    // GET /groups/:id/lessons
    groupParam: (param = "id") =>
      guard(async (req) => {
        const id = toId(req, param);
        if (id !== null) await own.assertOwnsGroup(req.user, id);
      }),

    // PATCH /children/:id: спочатку чия дитина (404), потім які поля (403)
    patchChild: guard(async (req) => {
      const id = toId(req, "id");
      if (id !== null) await own.assertOwnsChild(req.user, id);
      own.assertParentMayPatch(req.user, req.body);
    }),
  };
}

export const parentScope = createParentScope();
