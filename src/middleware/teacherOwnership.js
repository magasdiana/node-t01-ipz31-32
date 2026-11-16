import { isAuthEnabled } from "../config/auth.js";
import { ROLES } from "../config/roles.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { lessonsRepository } from "../modules/lessons/lessons.repository.js";
import { staffRepository } from "../modules/staff/staff.repository.js";

// Правила «своє / чуже» для Teacher (FR-21, FR-22).
// Викладач = співробітник, пов'язаний із користувачем через staff.user_id.
// Ставити після authorize() і validate(): ці guard-и дивляться лише на Teacher,
// Admin проходить без змін, а решту ролей уже відсіяв authorize().

const idFromRequest = (req) => Number(req.validated?.params?.id ?? req.params?.id);

// Фабрика із залежностями, щоб тестувати без БД
export function createTeacherGuards({ staffRepository, lessonsRepository }) {
  // Чи треба перевіряти цей запит: авторизація ввімкнена і роль Teacher
  const applies = (req) =>
    isAuthEnabled() && req.user?.role === ROLES.TEACHER;

  // GET /staff/:id/schedule: лише розклад співробітника, пов'язаного з цим користувачем.
  // Чужий і неіснуючий id дають однаково 403, щоб не підказувати, які id є.
  async function ownSchedule(req, _res, next) {
    try {
      if (!applies(req)) return next();

      const own = await staffRepository.findByUserId(req.user.id);
      if (!own || own.id !== idFromRequest(req)) {
        return next(
          new ForbiddenError("Викладач може переглядати лише власний розклад"),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  }

  // PATCH /lessons/:id: лише заняття, де lessons.staff_id = співробітник цього користувача
  async function ownLesson(req, _res, next) {
    try {
      if (!applies(req)) return next();

      const own = await staffRepository.findByUserId(req.user.id);
      if (!own) {
        return next(
          new ForbiddenError(
            "Обліковий запис викладача не пов'язаний зі співробітником",
          ),
        );
      }

      const lesson = await lessonsRepository.findById(idFromRequest(req));
      if (!lesson) return next(new NotFoundError("Заняття не знайдено"));

      if (lesson.staffId !== own.id) {
        return next(
          new ForbiddenError("Викладач може змінювати лише власні заняття"),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  }

  return { ownSchedule, ownLesson };
}

export const { ownSchedule, ownLesson } = createTeacherGuards({
  staffRepository,
  lessonsRepository,
});
