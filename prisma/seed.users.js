import "dotenv/config";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { ROLES } from "../src/config/roles.js";

// Демо-акаунти (по одному на роль). Паролі лише для локальної розробки й
// демонстрації: seed у production заборонений. Список для docs/handover.md.
export const DEMO_USERS = [
  { login: "admin", password: "Admin#2026", role: ROLES.ADMIN },
  { login: "manager", password: "Manager#2026", role: ROLES.MANAGER },
  { login: "parent", password: "Parent#2026", role: ROLES.PARENT },
  { login: "teacher", password: "Teacher#2026", role: ROLES.TEACHER },
];

// Створює демо-користувачів усередині переданої транзакції (tx).
// Ідемпотентна: якщо логін уже є, запис не дублюється.
// Повертає { admin, manager, parent, teacher } з рядками users, щоб seed.js
// міг прив'язати parent до дитини (children.parent_id), teacher до співробітника
// (staff.user_id).
export async function seedUsers(tx) {
  const byRole = {};

  for (const demo of DEMO_USERS) {
    const existing = await tx.user.findFirst({
      where: { data: { path: ["login"], equals: demo.login } },
    });

    byRole[demo.role] =
      existing ??
      (await tx.user.create({
        data: {
          data: {
            login: demo.login,
            passwordHash: await hashPassword(demo.password),
            role: demo.role,
          },
        },
      }));
  }

  return byRole;
}

// Окремий запуск: node prisma/seed.users.js (лише користувачі, без решти seed)
async function runStandalone() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed заборонено у production");
  }

  const runId = randomUUID().slice(0, 8);

  const users = await prisma.$transaction(async (tx) => {
    // Контекст для тригерів історії: source = seed, actor порожній
    await tx.$queryRaw`
      SELECT
        set_config('app.source', 'seed'::text, true) AS source,
        set_config('app.request_id', ${`seed-users-${runId}`}::text, true) AS request_id,
        set_config('app.actor', ''::text, true) AS actor
    `;
    return seedUsers(tx);
  });

  console.log("Демо-користувачі готові:");
  for (const demo of DEMO_USERS) {
    console.log(`  ${demo.role}: ${demo.login} / ${demo.password} (id ${users[demo.role].id})`);
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runStandalone()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
