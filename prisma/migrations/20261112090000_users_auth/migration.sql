-- Авторизація (NFR-02): таблиця users, зв'язки children.parent_id і staff.user_id.
-- Таблиця за T1–T6: лише id і data (JSONB).
-- data: { login, passwordHash, role }. Відкритий пароль у БД не потрапляє.

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Унікальність логіна на рівні БД. Дані лежать у JSON, тому індекс по виразу.
-- Логін зберігається в нижньому регістрі (його нормалізує API), тож індекс
-- фактично регістронезалежний.
CREATE UNIQUE INDEX "users_login_key" ON "users" (("data" ->> 'login'));

-- Форма запису: захист на рівні БД, навіть якщо хтось пише в таблицю повз API.
-- COALESCE: у CHECK значення NULL вважається «пройшло», тому відсутній ключ
-- (jsonb_typeof(NULL) = NULL) без COALESCE пропустив би запис.
-- Регулярний вираз passwordHash: лише bcrypt ($2a$/$2b$/$2y$, вартість, 53 символи),
-- тобто відкритий пароль у це поле записати неможливо (NFR-02).
ALTER TABLE "users" ADD CONSTRAINT "users_data_check" CHECK (
  COALESCE(
    jsonb_typeof("data") = 'object'
    AND jsonb_typeof("data" -> 'login') = 'string'
    AND length("data" ->> 'login') BETWEEN 3 AND 50
    AND "data" ->> 'login' = lower("data" ->> 'login')
    AND jsonb_typeof("data" -> 'passwordHash') = 'string'
    AND "data" ->> 'passwordHash' ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
    AND "data" ->> 'role' IN ('admin', 'manager', 'parent', 'teacher'),
    false
  )
);

-- AlterTable: батько дитини (FR-04, FR-22)
ALTER TABLE "children" ADD COLUMN "parent_id" INTEGER;

-- AlterTable: обліковий запис викладача (FR-21, FR-22)
ALTER TABLE "staff" ADD COLUMN "user_id" INTEGER;

-- Один користувач = не більше одного співробітника (NULL-и не конфліктують)
CREATE UNIQUE INDEX "staff_user_id_key" ON "staff"("user_id");

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Історія змін для users (FR-34). Функція history_log() створена в міграції
-- 20261109100000_history_triggers; passwordHash вона маскує як "***".
-- DROP IF EXISTS: на випадок, якщо тригер на users уже додано іншою міграцією.
DROP TRIGGER IF EXISTS "history_audit_users" ON "users";
CREATE TRIGGER "history_audit_users"
  AFTER INSERT OR UPDATE OR DELETE ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION history_log();

-- Назва сутності в історії: таблиця users -> сутність user.
-- Усі наявні гілки збережено без змін.
CREATE OR REPLACE FUNCTION history_entity_name(tbl text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE tbl
    WHEN 'rooms' THEN 'room'
    WHEN 'groups' THEN 'group'
    WHEN 'children' THEN 'child'
    WHEN 'staff' THEN 'staff'
    WHEN 'subjects' THEN 'subject'
    WHEN 'staff_subjects' THEN 'staffSubject'
    WHEN 'lessons' THEN 'lesson'
    WHEN 'payments' THEN 'payment'
    WHEN 'price_settings' THEN 'priceSettings'
    WHEN 'price_history' THEN 'priceHistory'
    WHEN 'users' THEN 'user'
    ELSE tbl
  END
$$;
