import { prisma } from "../src/lib/prisma.js";

async function main() {
  await prisma.payment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.child.deleteMany();
  await prisma.group.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.room.deleteMany();

  const rooms = [];
  for (const name of ["Кімната 1", "Кімната 2", "Кімната 3"]) {
    rooms.push(
      await prisma.room.create({
        data: { data: { name, monthlyCost: 50000 } },
      }),
    );
  }

  const groups = [];
  for (const [i, age] of [2, 3, 4].entries()) {
    groups.push(
      await prisma.group.create({
        data: {
          roomId: rooms[i].id,
          data: { name: `Група ${age} років`, age, limit: 20 },
        },
      }),
    );
  }

  const subjectNames = [
    "Музика",
    "Англійська",
    "Фізкультура",
    "Вільна боротьба",
    "Шахмати",
  ];
  for (const name of subjectNames) {
    await prisma.subject.create({ data: { data: { name } } });
  }

  await prisma.staff.create({
    data: {
      data: { fullName: "Менеджер Іван", position: "manager", salary: 80000 },
    },
  });
  await prisma.staff.create({
    data: {
      data: { fullName: "Викладач Петро", position: "teacher", salary: 40000 },
    },
  });
  await prisma.staff.create({
    data: {
      data: {
        fullName: "Вихователь Олена",
        position: "caregiver",
        salary: 40000,
      },
    },
  });
  await prisma.staff.create({
    data: {
      data: {
        fullName: "Помічниця Марія",
        position: "assistant",
        salary: 40000,
      },
    },
  });

  await prisma.child.create({
    data: {
      groupId: groups[1].id,
      data: {
        fullName: "Марійка",
        birthDate: "2022-05-10",
        parents: [{ name: "Батько", phone: "+380000000000" }],
        benefit: null,
        preferences: "не любить гречку",
      },
    },
  });

  console.log("Seed завершено");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
