import { ROLES } from "./roles.js";

// Карта доступу: які ролі можуть викликати маршрут.
// Джерело: docs/roles.md і розділ 6 плану. Тут лише перший шар перевірки
// («чи має роль право на дію взагалі»). Другий шар («своє / чуже»):
//   - Parent: фільтрація за children.parent_id (src/lib/ownership.js, PR Дениса);
//   - Teacher: src/middleware/teacherOwnership.js (staff.user_id = req.user.id).
// Маршрути беруть списки звідси: authorize(ACCESS.STAFF_ALL), без рядків ролей.

const { ADMIN, MANAGER, PARENT, TEACHER } = ROLES;

const roles = (...list) => Object.freeze(list);

export const ACCESS = Object.freeze({
  // ---------- Діти ----------
  CHILDREN_READ: roles(ADMIN, MANAGER, PARENT), // GET /children, GET /children/:id (Parent: лише свої)
  CHILDREN_CREATE: roles(ADMIN, MANAGER), // POST /children (FR-05: Parent не створює)
  CHILDREN_UPDATE: roles(ADMIN, MANAGER, PARENT), // PATCH /children/:id (Parent: лише preferences своєї дитини)
  CHILDREN_DELETE: roles(ADMIN, MANAGER), // DELETE /children/:id
  CHILDREN_INVOICE: roles(ADMIN, MANAGER, PARENT), // GET /children/:id/invoice (Parent: лише своя дитина)

  // ---------- Групи ----------
  GROUPS_READ: roles(ADMIN, MANAGER), // GET /groups, GET /groups/:id
  GROUPS_WRITE: roles(ADMIN, MANAGER), // POST /groups, PATCH /groups/:id
  GROUPS_DELETE: roles(ADMIN, MANAGER), // DELETE /groups/:id

  // ---------- Кімнати ----------
  ROOMS_READ: roles(ADMIN, MANAGER), // GET /rooms, GET /rooms/:id
  ROOMS_WRITE: roles(ADMIN), // POST, PATCH, DELETE /rooms

  // ---------- Персонал і гуртки ----------
  STAFF_ALL: roles(ADMIN), // GET, POST, PATCH, DELETE /staff, GET /staff/:id
  STAFF_SCHEDULE: roles(ADMIN, TEACHER), // GET /staff/:id/schedule (Teacher: лише свій)
  SUBJECTS_ALL: roles(ADMIN), // GET, POST, PATCH, DELETE /subjects

  // ---------- Заняття та розклад ----------
  GROUP_LESSONS: roles(ADMIN, PARENT, TEACHER), // GET /groups/:id/lessons (Parent: група своєї дитини)
  LESSON_UPDATE: roles(ADMIN, TEACHER), // PATCH /lessons/:id (Teacher: лише власні)
  SCHEDULES_GENERATE: roles(ADMIN), // POST /schedules
  SCHEDULES_FORECAST: roles(ADMIN), // GET /schedules/forecast (маршрут додає окремий PR)

  // ---------- Оплати ----------
  PAYMENTS_READ: roles(ADMIN, MANAGER, PARENT), // GET /payments, GET /payments/:id (Parent: лише свої)
  PAYMENTS_CREATE: roles(ADMIN, MANAGER), // POST /payments
  PAYMENTS_DELETE: roles(ADMIN, MANAGER), // DELETE /payments/:id

  // ---------- Звіти, ціни, історія, користувачі: лише Admin ----------
  REPORTS: roles(ADMIN), // /reports/profit, /reports/min-rooms, /reports/forecast-profit
  PRICES: roles(ADMIN), // /settings/prices, /settings/prices/history
  HISTORY: roles(ADMIN), // /history, /history/state, /history/:id, /children/:id/history, /groups/:id/history
  USERS: roles(ADMIN), // /users
});

// Маршрути без токена (монтуються в app.js до authenticate)
export const PUBLIC_ROUTES = Object.freeze([
  "POST /auth/login",
  "GET /health",
  "GET /openapi.json",
  "GET /docs",
]);
