import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { userDto } from "../../lib/userDto.js";

const DUPLICATE_LOGIN = "Користувач з таким логіном вже існує";

// Порушення унікального індексу users_login_key. Prisma може віддати P2002,
// а для індексу по виразу (data->>'login') інколи лише повідомлення PostgreSQL.
export function isUniqueViolation(err) {
  return (
    err?.code === "P2002" ||
    err?.code === "23505" ||
    /users_login_key/.test(String(err?.message ?? ""))
  );
}

// Залежності передаються ззовні: сервіс не знає ні про Prisma, ні про bcrypt,
// тому тестується без бази.
export function createUsersService({ usersRepository, hashPassword }) {
  return {
    async list() {
      const rows = await usersRepository.list();
      return rows.map(userDto);
    },

    async getById(id) {
      const row = await usersRepository.getById(id);
      if (!row) throw new NotFoundError("Користувача не знайдено");
      return userDto(row);
    },

    // input: { login, password, role }, login уже у нижньому регістрі (Zod)
    async create({ login, password, role }) {
      // Швидка перевірка для зрозумілої помилки. Остаточний захист від
      // дубліката (і від гонки двох запитів) дає унікальний індекс у БД.
      if (await usersRepository.findByLogin(login)) {
        throw new ConflictError(DUPLICATE_LOGIN);
      }

      // У БД потрапляє лише хеш. Відкритий пароль далі не передається.
      const passwordHash = await hashPassword(password);

      try {
        const row = await usersRepository.create({
          data: { login, passwordHash, role },
        });
        return userDto(row);
      } catch (err) {
        // Помилку Prisma не логуємо і не віддаємо далі: у ній є аргументи запиту
        if (isUniqueViolation(err)) throw new ConflictError(DUPLICATE_LOGIN);
        throw err;
      }
    },
  };
}
