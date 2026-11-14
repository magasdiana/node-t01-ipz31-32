# Авторизація: users, login, JWT, middleware

Довідка по основі авторизації (6-й тиждень, PR `feat(auth): users, login з хешем пароля, middleware`).
Права ролей на маршрутах (`authorize`) і «своє / чуже» для Parent і Teacher додають Богдан і Денис.

## Модель даних

Таблиця `users` (за T1–T6 лише `id` і `data`):

| Поле `data` | Опис |
| --- | --- |
| `login` | унікальний, 3–50 символів, нижній регістр (`a-z 0-9 . _ -`) |
| `passwordHash` | лише bcrypt-хеш (`$2a$/$2b$/$2y$…`), відкритий пароль не зберігається |
| `role` | `admin`, `manager`, `parent`, `teacher` |

Зв'язки (nullable FK): `children.parent_id → users.id` (батько), `staff.user_id → users.id` (обліковий запис викладача, унікальний).

Захист на рівні БД (міграція `20261112090000_users_auth`):

- унікальний індекс `users_login_key` по `data->>'login'`: дубліката логіна не буде навіть при гонці запитів;
- `CHECK users_data_check`: `passwordHash` має формат bcrypt (відкритий пароль записати неможливо), логін у нижньому регістрі, роль зі списку;
- тригер `history_audit_users`: зміни users потрапляють в історію, `passwordHash` у знімках замасковано як `***`.

## Змінні оточення

| Змінна | Опис |
| --- | --- |
| `JWT_SECRET` | секрет підпису, ≥ 16 символів; у production заглушка `change_me…` не приймається; сервер не стартує без нього |
| `JWT_EXPIRES_IN` | термін дії токена (`8h` за замовчуванням) |
| `AUTH_ENABLED` | `true` за замовчуванням. `false` вимикає перевірку токена лише поза production (потрібно наявним тестам). У production (`NODE_ENV=production`) авторизація завжди ввімкнена |
| `BCRYPT_ROUNDS` | вартість bcrypt (10 за замовчуванням, 4–14; у тестах 4) |

## API

| Запит | Доступ | Результат |
| --- | --- | --- |
| `POST /auth/login` `{ login, password }` | публічний | `200 { token, user: { id, login, role } }`, `401` при хибних даних, `400` при порожніх полях |
| `GET /users`, `GET /users/{id}` | Admin | користувачі без `passwordHash` |
| `POST /users` `{ login, password, role }` | Admin | `201` + користувач; `409`, якщо логін зайнятий; `400` при слабкому паролі (< 8 символів, > 72 байтів) або невідомій ролі |

Відкриті без токена: `/auth/login`, `/docs`, `/openapi.json`, `/health`. Усе інше: `Authorization: Bearer <token>`.

Помилки в єдиному форматі `{ error: { status, message, details } }`: `401` (немає / недійсний / прострочений токен), `403` (роль не підходить).

## Для тих, хто пише код нижче за течією

```js
import { authorize } from "../../middleware/auth.js";
import { ROLES } from "../../config/roles.js";

router.get("/", authorize(ROLES.ADMIN, ROLES.MANAGER), controller.list);
```

- Після `authenticate` (підключений в `app.js` для всіх маршрутів, крім публічних) у запиті є `req.user = { id, role }`.
- Той самий користувач автоматично потрапляє в `actor` історії змін: запис у БД має йти через `withRequestContext`, як і раніше.
- Токен містить лише `sub` (id користувача), `role`, `iat`, `exp`. Логіна і хеша в ньому немає.
- Приклад «свого / чужого»: `staff.user_id = req.user.id` (Teacher), `children.parent_id = req.user.id` (Parent).
- Коли `AUTH_ENABLED=false`, `req.user` може бути порожнім: код, що залежить від ролі, має це враховувати (у тестах з правами вмикайте `AUTH_ENABLED=true`).

## Демо-акаунти (лише для розробки; `npm run seed` заборонений у production)

| Роль | Логін | Пароль |
| --- | --- | --- |
| Admin | `admin` | `Admin#2026` |
| Manager | `manager` | `Manager#2026` |
| Parent | `parent` | `Parent#2026` |
| Teacher | `teacher` | `Teacher#2026` |

Окремо створити лише користувачів: `node prisma/seed.users.js`.

## Відомі обмеження

- Токен без стану (stateless): видалення користувача чи зміна ролі діє після завершення терміну токена (`JWT_EXPIRES_IN`).
- Немає обмеження частоти спроб логіна (rate limit) і зміни пароля через API: це поза обсягом тижня.
