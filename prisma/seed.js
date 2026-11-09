import "dotenv/config";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { prisma } from "../src/lib/prisma.js";
import {
  DEFAULT_PRICES,
  LIMITS,
  ROOM,
  SALARY,
} from "../src/config/constants.js";

// Seed стирає всі дані, тому в production він заборонений
if (process.env.NODE_ENV === "production") {
  throw new Error("Seed заборонено у production");
}

const GROUP_AGES = [2, 3, 4, 5];
const SUBJECT_NAMES = [
  "Музика",
  "Англійська",
  "Фізкультура",
  "Вільна боротьба",
  "Шахмати",
];

// Історія змін пишеться тригерами PostgreSQL (міграція history_triggers).
// Тригер бере source, requestId і actor з налаштувань транзакції app.*
const HISTORY_SOURCE = "seed";
// Пауза між кроками демо, щоб createdAt у записах історії строго зростав
const DEMO_STEP_DELAY_MS = 1000;
// Вік дитини й груп у демо-сценарії (docs/history-scenario.md)
const DEMO_AGE = 3;

// Дата народження, за якою вік на сьогодні дорівнює age (age років і 3 місяці)
function birthDateForAge(age) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - (age * 12 + 3));
  return d.toISOString().slice(0, 10);
}

// Передає тригерам контекст зміни. is_local = true: діє лише до кінця транзакції.
// actor порожній: авторизації ще немає, тригер запише actor = null
async function setHistoryContext(tx, requestId) {
  await tx.$queryRaw`
    SELECT
      set_config('app.source', ${HISTORY_SOURCE}::text, true) AS source,
      set_config('app.request_id', ${requestId}::text, true) AS request_id,
      set_config('app.actor', ''::text, true) AS actor
  `;
}

async function clear(tx) {
  // Порядок важливий: спочатку ті, хто посилається на інші таблиці
  await tx.payment.deleteMany();
  await tx.lesson.deleteMany();
  await tx.staffSubject.deleteMany();
  await tx.child.deleteMany();
  await tx.staff.deleteMany();
  await tx.group.deleteMany();
  await tx.subject.deleteMany();
  await tx.room.deleteMany();
  await tx.priceHistory.deleteMany();
  await tx.priceSettings.deleteMany();

  // Записи history незмінні: тригер забороняє DELETE, тому deleteMany тут не
  // підходить. TRUNCATE не викликає рядкові тригери. Це також прибирає записи
  // «delete», які щойно створили очищення вище.
  await tx.$executeRaw`TRUNCATE TABLE "history" RESTART IDENTITY`;
}

// Демо-історія за docs/history-scenario.md:
// дитину створено -> змінено групу -> змінено пільгу -> видалено.
// Для кроку 2 потрібна друга група того ж віку (FR-07) з окремою кімнатою.
// Тимчасові кімната й група видаляються наприкінці, щоб не змінити звіти
// та розклад; їхня історія в history лишається.
async function createHistoryDemo(tx, groupA, runId) {
  const age = groupA.data.age;
  let step = 0;

  // Кожен крок демо імітує окремий запит, тому має власний requestId
  async function nextRequest(label) {
    step += 1;
    await sleep(DEMO_STEP_DELAY_MS);
    await setHistoryContext(tx, `seed-${runId}-demo-${step}-${label}`);
  }

  await nextRequest("prepare");
  const roomB = await tx.room.create({
    data: {
      data: {
        name: `Демо кімната Б для ${age}-річних`,
        cost: ROOM.ROOM_COST_DEFAULT,
      },
    },
  });
  const groupB = await tx.group.create({
    data: {
      roomId: roomB.id,
      data: {
        name: `Демо група Б ${age} років`,
        age,
        limit: LIMITS.GROUP_MAX_CHILDREN,
      },
    },
  });

  // Крок 1: POST /children (формат даних як в API дітей)
  await nextRequest("child-create");
  const created = await tx.child.create({
    data: {
      groupId: groupA.id,
      data: {
        name: "Тест Дитина",
        birthDate: birthDateForAge(age),
        guardians: ["Мати Тест"],
        relativeVip: false,
        preferences: "",
        benefitType: "none",
      },
    },
  });

  // Крок 2: PATCH /children/{id} { groupId: група B }
  await nextRequest("child-move-group");
  const moved = await tx.child.update({
    where: { id: created.id },
    data: { groupId: groupB.id },
  });

  // Крок 3: PATCH /children/{id} { benefitType: "medium" } (пільга 20%)
  await nextRequest("child-change-benefit");
  const benefited = await tx.child.update({
    where: { id: moved.id },
    data: { data: { ...moved.data, benefitType: "medium" } },
  });

  // Крок 4: DELETE /children/{id}
  await nextRequest("child-delete");
  await tx.child.delete({ where: { id: benefited.id } });

  // Прибираємо тимчасові групу й кімнату
  await nextRequest("cleanup");
  await tx.group.delete({ where: { id: groupB.id } });
  await tx.room.delete({ where: { id: roomB.id } });

  return created.id;
}

async function seedAll(tx) {
  const runId = randomUUID().slice(0, 8);

  // Усе, що створює основний seed, отримує source = "seed" і один requestId
  await setHistoryContext(tx, `seed-${runId}`);

  await clear(tx);

  // Кімнати: по одній на групу
  const rooms = [];
  for (const age of GROUP_AGES) {
    rooms.push(
      await tx.room.create({
        data: {
          data: {
            name: `Кімната для ${age}-річних`,
            cost: ROOM.ROOM_COST_DEFAULT,
          },
        },
      }),
    );
  }

  // Групи: віки 2, 3, 4, 5, ліміт 20
  const groups = [];
  for (const [i, age] of GROUP_AGES.entries()) {
    groups.push(
      await tx.group.create({
        data: {
          roomId: rooms[i].id,
          data: {
            name: `Група ${age} років`,
            age,
            limit: LIMITS.GROUP_MAX_CHILDREN,
          },
        },
      }),
    );
  }

  // Гуртки
  const subjects = [];
  for (const name of SUBJECT_NAMES) {
    subjects.push(await tx.subject.create({ data: { data: { name } } }));
  }

  // Адміністратор і менеджер
  await tx.staff.create({
    data: {
      data: {
        fullName: "Власник садка",
        position: "admin",
        salary: SALARY.ADMIN,
      },
    },
  });
  await tx.staff.create({
    data: {
      data: {
        fullName: "Менеджер Іван",
        position: "manager",
        salary: SALARY.MANAGER,
      },
    },
  });

  // Викладачі: LIMITS.TEACHERS_PER_SUBJECT на кожен гурток, зв'язок через staff_subjects
  for (const subject of subjects) {
    for (let k = 1; k <= LIMITS.TEACHERS_PER_SUBJECT; k++) {
      const teacher = await tx.staff.create({
        data: {
          data: {
            fullName: `Викладач ${subject.data.name} ${k}`,
            position: "teacher",
            salary: SALARY.TEACHER,
          },
        },
      });
      await tx.staffSubject.create({
        data: { staffId: teacher.id, subjectId: subject.id },
      });
    }
  }

  // Вихователь і помічник на кожну групу
  for (const group of groups) {
    const age = group.data.age;
    await tx.staff.create({
      data: {
        groupId: group.id,
        data: {
          fullName: `Вихователь групи ${age} років`,
          position: "educator",
          salary: SALARY.EDUCATOR_BASE,
        },
      },
    });
    await tx.staff.create({
      data: {
        groupId: group.id,
        data: {
          fullName: `Помічник групи ${age} років`,
          position: "assistant",
          salary: SALARY.ASSISTANT_BASE,
        },
      },
    });
  }

  // Діти: по 3 в кожній групі, вік відповідає групі
  const benefits = [null, "LEVEL_1", "LEVEL_3"];
  for (const group of groups) {
    const age = group.data.age;
    for (let j = 0; j < 3; j++) {
      const child = await tx.child.create({
        data: {
          groupId: group.id,
          data: {
            fullName: `Дитина ${age} років ${j + 1}`,
            birthDate: birthDateForAge(age),
            parents: [
              {
                name: `Мати дитини ${j + 1}`,
                phone: "+380000000001",
                relation: "мати",
              },
              {
                name: `Батько дитини ${j + 1}`,
                phone: "+380000000002",
                relation: "батько",
              },
            ],
            relative:
              j === 0 && age === 2
                ? { name: "Депутат Тестовий", role: "депутат" }
                : null,
            benefit: benefits[j],
            preferences: j === 0 ? "не любить гречку" : "",
          },
        },
      });

      // Додаємо запис про оплату для цієї дитини, щоб звіти мали дані
      await tx.payment.create({
        data: {
          childId: child.id,
          data: {
            status: "paid",
            amount: 21600,
            period: "month",
            periodStart: "2026-10",
            items: [
              { type: "tuition", amount: 15000 },
              { type: "meal", amount: 6600 },
            ],
          },
        },
      });
    }
  }

  // Початкові ціни (price_settings). Далі зміни пишуться в price_history.
  await tx.priceSettings.create({
    data: {
      data: {
        ...DEFAULT_PRICES,
        roomCostDefault: ROOM.ROOM_COST_DEFAULT,
        effectiveFrom: new Date().toISOString().slice(0, 10),
      },
    },
  });

  // Демо-історія змін для перевірки FR-34–FR-36
  const groupA = groups.find((g) => g.data.age === DEMO_AGE);
  const demoChildId = await createHistoryDemo(tx, groupA, runId);

  return demoChildId;
}

async function main() {
  // Одна транзакція: якщо щось впаде, база лишається як була (разом з history).
  // Контекст app.* діє лише в межах транзакції, тому всі кроки йдуть через tx.
  const demoChildId = await prisma.$transaction((tx) => seedAll(tx), {
    maxWait: 10_000,
    timeout: 120_000,
  });

  console.log("Seed завершено");
  console.log(
    `Демо-історія: GET /history?entity=child&entityId=${demoChildId}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());