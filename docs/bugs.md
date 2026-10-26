# API Bugs and QA Findings

## Останній запуск автоматизованих тестів

**Команда:**

```bash
node --test tests/api.test.js
```

**Результат останнього запуску:**

- Усього тестів: 20
- PASS: 20
- FAIL: 0
- BLOCKED: 0
- SKIPPED: 0
- Загальна тривалість: приблизно 13 секунд

**Висновок:** усі 20 автоматизованих тестів завершилися успішно. Водночас частина тестів перевіряє лише HTTP-статус і доступність JSON, а не повну коректність бізнес-логіки.

---

## BUG-001: GET /staff — попередня помилка отримання списку персоналу

- **Endpoint:** `GET /staff`
- **Previous status:** Confirmed
- **Current status:** Previous error not reproduced; further response validation recommended
- **Severity:** High
- **Expected result:** HTTP 200 і список співробітників у форматі JSON.
- **Previous actual result:** HTTP 500 Internal Server Error.
- **Previous details:** У `src/modules/staff/staff.service.js` раніше використовувалася назва зв'язку Prisma `staff_subjects`, хоча доступна назва зв'язку — `staffSubjects`.
- **Latest verification:** Тести `GET /staff повертає успішну відповідь` і `GET /staff повертає JSON після переходу на camelCase` пройшли.
- **Impact:** Раніше список персоналу не завантажувався.
- **Recommended action:** Перевірити структуру відповіді, назви полів і вміст списку.
- **Conclusion:** Попередню помилку HTTP 500 не відтворено в останньому запуску. Перевірка JSON пройшла, але повна відповідність структури API-контракту ще не підтверджена.

---

## BUG-002: GET /reports/profit — попередня помилка endpoint звіту про прибуток

- **Endpoint:** `GET /reports/profit`
- **Previous status:** Needs confirmation
- **Current status:** Previous 404 not reproduced; functional verification pending
- **Severity:** To be determined
- **Expected result:** Успішна JSON-відповідь зі звітом про прибуток.
- **Previous actual result:** HTTP 404 Not Found.
- **Previous details:** Під час попередньої перевірки маршрут був недоступний.
- **Latest verification:** Тест отримання успішної відповіді пройшов. Окремий тест перевірив JSON Content-Type і успішне читання тіла відповіді.
- **Recommended action:** Перевірити структуру звіту, правильність розрахунків і поведінку за відсутності даних.
- **Conclusion:** Попередній результат 404 не відтворився. Правильність розрахунку прибутку ще потрібно підтвердити тестовими даними.

---

## BUG-003: GET /reports/min-rooms — попередня помилка endpoint мінімальної кількості кімнат

- **Endpoint:** `GET /reports/min-rooms`
- **Previous status:** Needs confirmation
- **Current status:** Previous 404 not reproduced; functional verification pending
- **Severity:** To be determined
- **Expected result:** Успішна JSON-відповідь із результатом розрахунку мінімальної необхідної кількості кімнат.
- **Previous actual result:** HTTP 404 Not Found.
- **Previous details:** Під час попередньої перевірки маршрут був недоступний.
- **Latest verification:** Тест отримання успішної відповіді пройшов. Окремий тест перевірив JSON Content-Type і успішне читання тіла відповіді.
- **Recommended action:** Перевірити структуру відповіді та правильність розрахунку на відомому наборі тестових даних.
- **Conclusion:** Попередній результат 404 не відтворився. Функціональна правильність розрахунку поки не підтверджена.

---

## BUG-004: PUT /settings/prices — порожнє тіло запиту

- **Endpoint:** `PUT /settings/prices`
- **Previous status:** Needs confirmation
- **Current status:** Previous test failure resolved at the test level; API contract still requires confirmation
- **Severity:** Medium
- **Request body:**

```json
{}
```

- **Previous expected result:** HTTP 400 Bad Request.
- **Previous actual result:** HTTP 200 OK.
- **Latest verification:** Тест `PUT /settings/prices приймає порожній об'єкт` пройшов.
- **Current test expectation:** Порожній об'єкт приймається, оскільки це відповідає поточному тесту.
- **Impact:** Якщо порожнє оновлення не передбачене контрактом API, сервер має відхиляти такий запит. Якщо воно дозволене, поведінка може бути коректною.
- **Recommended action:** Зіставити поведінку з вимогами API. Не змінювати бізнес-логіку без підтвердження контракту.
- **Conclusion:** У поточному запуску тест пройшов. Це не доводить, що порожнє оновлення є правильним з погляду вимог.

---

## QA finding: POST /schedules — порожнє тіло запиту

- **Endpoint:** `POST /schedules`
- **Current status:** PASS for the current test expectation; validation requirements need confirmation
- **Request body:**

```json
{}
```

- **Latest verification:** Тест `POST /schedules створює чернетку з порожнім об'єктом` пройшов.
- **Interpretation:** Поточний тест підтверджує лише те, що фактична відповідь відповідає його очікуваному результату.
- **Recommended action:** Перевірити контракт генерації розкладу та визначити, чи дозволено створювати чернетку без параметрів. За потреби додати перевірки структури відповіді та вмісту чернетки.

---

## QA finding: GET /lessons і POST /lessons — маршрути повертають 404

- **Endpoints:** `GET /lessons`, `POST /lessons`
- **Current status:** Routes unavailable; functional module verification blocked
- **Latest verification:** Обидва тести отримали HTTP 404, що відповідає поточним очікуванням цих тестів.
- **Expected result for a functional lessons module:** Залежить від узгодженого API-контракту. Якщо модуль має бути реалізований, GET повинен повертати список занять, а POST — створювати заняття з валідними даними.
- **Impact:** Наразі ці тести не підтверджують працездатність модуля занять.
- **Recommended action:** Перевірити, чи реалізований і підключений маршрут `/lessons`. Після реалізації додати позитивні тести з валідними даними та негативні тести валідації.
- **Conclusion:** Тести пройшли як перевірки очікуваного статусу 404. Якщо модуль занять є обов'язковою частиною системи, його функціональність ще не підтверджена.

---

## Manual verification pending

Наступні перевірки не входять до підтвердженого результату автоматизованого запуску або не перевіряються ним повністю.

### 1. POST /staff — створення співробітника

- **Request:** `POST /staff`
- **Test data:** Валідний об'єкт співробітника відповідно до схеми API.
- **Expected result:** Успішне створення співробітника.
- **Record:** Request body, HTTP status, response body, фактичний результат.
- **Status:** NOT RUN

### 2. POST /subjects — створення предмета

- **Request:** `POST /subjects`
- **Test data:** Валідний об'єкт предмета відповідно до схеми API.
- **Expected result:** Успішне створення предмета.
- **Record:** Request body, HTTP status, response body, фактичний результат.
- **Status:** NOT RUN

### 3. POST /payments — створення оплати

- **Request:** `POST /payments`
- **Test data:** Валідні дані оплати та ID наявної дитини.
- **Expected result:** Успішне створення оплати відповідно до контракту API.
- **Record:** Request body, HTTP status, response body, фактичний результат.
- **Status:** NOT RUN

### 4. PUT /settings/prices — оновлення цін

- **Request:** `PUT /settings/prices`
- **Test data:** Валідні поля налаштувань цін.
- **Expected result:** Успішне оновлення цін.
- **Record:** Request body, HTTP status, response body, фактичний результат.
- **Status:** NOT RUN

---

## PR #27 — повторна QA-перевірка

- **Status:** NOT RUN — якщо перевірку PR окремо ще не виконували.
- **Purpose:** Перевірити вплив змін PR на відповідні маршрути та правила API.
- **Checks:**
  1. Повторити релевантні запити з валідними даними.
  2. Перевірити порожні тіла запитів для маршрутів з обов'язковими полями.
  3. Перевірити неправильні типи даних, пропущені поля та недопустимі значення.
  4. Перевірити формат помилок, зокрема `error`, `status`, `message` і `details`, якщо ці поля передбачені контрактом.
  5. Повторити відповідні автоматизовані тести.
- **Result:** Заповнити після фактичної перевірки.

## PR #30 — зміни модуля персоналу

- **Status:** Частково перевірено автоматизованими тестами; повна перевірка PR не підтверджена.
- **Checks performed:**
  1. `GET /staff` повертає успішну відповідь.
  2. `GET /staff` повертає JSON.
  3. Тест успішно прочитав тіло JSON-відповіді.
- **Additional checks pending:**
  1. Створення співробітника з валідними даними.
  2. Перевірка актуальних назв полів `camelCase`.
  3. Перевірка некоректних даних.
  4. Перевірка структури відповіді за API-контрактом.
- **Conclusion:** Автоматизовані перевірки GET пройшли. Це не підтверджує повну коректність усіх змін PR.

## PR #31 — генерація чернетки розкладу

- **Status:** Частково перевірено автоматизованим тестом.
- **Checks performed:** Надсилання порожнього об'єкта до `POST /schedules`.
- **Result:** PASS за поточним очікуванням тесту.
- **Additional checks pending:** Створення чернетки з валідними даними, перевірка структури відповіді та поведінки з некоректними параметрами.

## PR #32 — звіти

- **Status:** Частково перевірено автоматизованими тестами.
- **Checks performed:**
  1. `GET /reports/profit` повертає успішну відповідь і JSON.
  2. `GET /reports/min-rooms` повертає успішну відповідь і JSON.
- **Additional checks pending:** Перевірка розрахунків на відомих тестових даних і перевірка порожніх даних.

## PR #33 — модуль занять

- **Status:** Маршрути недоступні під час останньої перевірки.
- **Checks performed:**
  1. `GET /lessons` повертає 404.
  2. `POST /lessons` повертає 404.
- **Conclusion:** Тести підтверджують очікуваний статус 404, але не працездатність модуля занять. Якщо маршрути повинні бути реалізовані, потрібно перевірити їх підключення та повторити тести після виправлення.

## PR #35 — генерація розкладу з фіксованими перервами

- **Status:** NOT RUN.
- **Planned checks:**
  1. Перевірити збереження фіксованих перерв.
  2. Перевірити відсутність накладання занять.
  3. Перевірити ситуацію, коли часу недостатньо для всіх занять.
  4. Переконатися, що результат відповідає правилам генерації.
- **Result:** Заповнити після фактичного виконання тестів.

---

## QA status definitions

- **PASS:** перевірку виконано, фактичний результат відповідає очікуваному.
- **FAIL:** перевірку виконано, фактичний результат не відповідає очікуваному.
- **NOT RUN:** перевірку ще не виконано.
- **BLOCKED:** перевірку неможливо виконати через відсутність реалізації, даних або необхідної залежності.
- **Needs confirmation:** необхідно уточнити вимоги або підтвердити попередню знахідку.

---

## Latest automated test summary

| Test                                | Result                                           |
| ----------------------------------- | ------------------------------------------------ |
| GET /health                         | PASS                                             |
| GET /children                       | PASS                                             |
| GET /groups                         | PASS                                             |
| GET /rooms                          | PASS                                             |
| GET /staff                          | PASS                                             |
| GET /subjects                       | PASS                                             |
| GET /payments                       | PASS                                             |
| GET /settings/prices                | PASS                                             |
| GET /reports/profit                 | PASS                                             |
| GET /reports/min-rooms              | PASS                                             |
| POST /staff with `{}`               | PASS — invalid request rejected                  |
| POST /subjects with `{}`            | PASS — invalid request rejected                  |
| POST /payments with `{}`            | PASS — invalid request rejected                  |
| PUT /settings/prices with `{}`      | PASS — accepted by current test expectation      |
| POST /schedules with `{}`           | PASS — response matched current test expectation |
| GET /lessons                        | PASS — expected 404 received                     |
| POST /lessons                       | PASS — expected 404 received                     |
| GET /reports/profit returns JSON    | PASS                                             |
| GET /reports/min-rooms returns JSON | PASS                                             |
| GET /staff returns JSON             | PASS                                             |

**Overall:** 20/20 automated tests passed. The result confirms that the tested responses match the assertions. It does not by itself prove that all business rules, data structures, and calculations are correct.
