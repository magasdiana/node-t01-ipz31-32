# Зміни в prisma/seed.js (три невеликі вставки)

`seed.js` лишається вашим файлом, його також правитиме Богдан (зв'язки parent/teacher),
тому замість повної заміни — три точкові вставки.

## 1. Імпорт (після імпорту `constants.js`)

```js
import { seedUsers } from "./seed.users.js";
```

## 2. `clear(tx)`: видаляти users (після staff і children, до TRUNCATE history)

```js
  await tx.priceHistory.deleteMany();
  await tx.priceSettings.deleteMany();
  await tx.user.deleteMany();            // <-- додати

  // Записи history незмінні ...
  await tx.$executeRaw`TRUNCATE TABLE "history" RESTART IDENTITY`;
```

## 3. `seedAll(tx)`: створити користувачів (одразу після `await clear(tx);`)

```js
  await clear(tx);

  // Демо-акаунти: admin, manager, parent, teacher
  await seedUsers(tx);
```

`seedUsers` повертає `{ admin, manager, parent, teacher }` (рядки таблиці users).
Богдан, коли прив'язуватиме parent до дитини, а teacher до співробітника, напише
`const users = await seedUsers(tx);` і використає `users.parent.id`, `users.teacher.id`.
Присвоєння зараз не додаємо: невикористана змінна дала б помилку ESLint `no-unused-vars`.
