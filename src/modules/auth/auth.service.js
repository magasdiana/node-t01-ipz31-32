import { UnauthorizedError } from "../../lib/errors.js";
import { userDto } from "../../lib/userDto.js";

// Однакове повідомлення і для неіснуючого логіна, і для хибного пароля:
// так не видно, які логіни є в системі.
export const INVALID_CREDENTIALS = "Невірний логін або пароль";

export function createAuthService({
  usersRepository,
  verifyPassword,
  burnPasswordCheck,
  signToken,
}) {
  return {
    // Повертає { token, user: { id, login, role } }. passwordHash не повертається.
    async login({ login, password }) {
      const row = await usersRepository.findByLogin(login);
      const hash = row?.data?.passwordHash;

      if (!row || typeof hash !== "string") {
        await burnPasswordCheck(password);
        throw new UnauthorizedError(INVALID_CREDENTIALS);
      }

      if (!(await verifyPassword(password, hash))) {
        throw new UnauthorizedError(INVALID_CREDENTIALS);
      }

      const user = userDto(row);
      return { token: signToken(user), user };
    },
  };
}
