import "dotenv/config";
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

// Дата народження, за якою вік на сьогодні дорівнює age (age років і 3 місяці)
function birthDateForAge(age) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - (age * 12 + 3));
  return d.toISOString().slice(0, 10);
}

async function clear() {
  // Порядок важливий: спочатку ті, хто посилається на інші таблиці
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.staffSubject.deleteMany(),
    prisma.child.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.group.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.room.deleteMany(),
    prisma.priceHistory.deleteMany(),
    prisma.priceSettings.deleteMany(),
  ]);
}

async function main() {
  await clear();

  // Кімнати: по одній на групу
  const rooms = [];
  for (const age of GROUP_AGES) {
    rooms.push(
      await prisma.room.create({
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
      await prisma.group.create({
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
    subjects.push(await prisma.subject.create({ data: { data: { name } } }));
  }

  // Адміністратор і менеджер
  await prisma.staff.create({
    data: {
      data: {
        fullName: "Власник садка",
        position: "admin",
        salary: SALARY.ADMIN,
      },
    },
  });
  await prisma.staff.create({
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
      const teacher = await prisma.staff.create({
        data: {
          data: {
            fullName: `Викладач ${subject.data.name} ${k}`,
            position: "teacher",
            salary: SALARY.TEACHER,
          },
        },
      });
      await prisma.staffSubject.create({
        data: { staffId: teacher.id, subjectId: subject.id },
      });
    }
  }

  // Вихователь і помічник на кожну групу
  for (const group of groups) {
    const age = group.data.age;
    await prisma.staff.create({
      data: {
        groupId: group.id,
        data: {
          fullName: `Вихователь групи ${age} років`,
          position: "caregiver",
          salary: SALARY.CAREGIVER_BASE,
        },
      },
    });
    await prisma.staff.create({
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
      await prisma.child.create({
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
            // FR-03: один родич-депутат для прикладу
            relative:
              j === 0 && age === 2
                ? { name: "Депутат Тестовий", role: "депутат" }
                : null,
            benefit: benefits[j],
            preferences: j === 0 ? "не любить гречку" : "",
          },
        },
      });
    }
  }

  // Початкові ціни (price_settings). Далі зміни пишуться в price_history.
    await prisma.priceSettings.create({
    data: {
      data: {
        ...DEFAULT_PRICES,
        roomCostDefault: ROOM.ROOM_COST_DEFAULT,
        effectiveFrom: new Date().toISOString().slice(0, 10),
      },
    },
    });
  
  console.log("Seed завершено");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
