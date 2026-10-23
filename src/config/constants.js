// Усі гроші в грн/міс, якщо не вказано інше.
// Позначка ПРИПУЩЕННЯ: значення не з ТЗ, потрібне рішення BA/власника.

// ---------- Ліміти (розділ 4 ТЗ) ----------
export const LIMITS = {
  GROUP_MAX_CHILDREN: 20, // FR-08, жорстка межа
  BONUS_THRESHOLD_CHILDREN: 12, // FR-11, доплата після 12-ї дитини
  CHILD_AGE_MIN: 2, // FR-01
  CHILD_AGE_MAX: 5, // FR-01
  PARENTS_MAX: 3, // FR-02, опікунів на дитину
  TEACHERS_PER_SUBJECT: 3, // FR-15
  TEACHER_MAX_MULTIPLIER: 3, // FR-16, викладачів можна брати у x2 або x3
};

// ---------- Бізнес-правила A1-A4 (розділ 8 ТЗ) ----------
export const ASSUMPTIONS = {
  A1_WORKING_DAYS_PER_MONTH: 22, // для розрахунку харчування
  A2_DISCOUNT_MODE: "multiplicative", // пільга і річна знижка множаться
  A3_BASE_STAFF_SALARY: 40000, // базова ставка вихователя і помічника = зарплата викладача
  A4_LESSON_MINUTES: 30, // тривалість одного уроку
};

// ---------- Ціни за замовчуванням (розділ 4.6 ТЗ) ----------
// Це початкові значення для таблиці price_settings. Далі Admin змінює їх через API,
// а зміни пишуться в price_history.
export const DEFAULT_PRICES = {
  TUITION_MONTHLY: 15000, // FR-23, навчання без харчування
  // FR-25: харчування за день залежно від віку
  MEALS_PER_DAY_BY_AGE: { 2: 300, 3: 400, 4: 500, 5: 600 },
  // FR-24: пільги у відсотках (10/20/30). NONE = без пільги
  BENEFIT_PERCENT: { NONE: 0, LEVEL_1: 10, LEVEL_2: 20, LEVEL_3: 30 },
  ANNUAL_PAYMENT_PERCENT: 12, // FR-26
  // Підтверджено замовником: знижки діють лише на навчання, харчування без знижок
  DISCOUNT_APPLIES_TO: "tuition",
  // ПРИПУЩЕННЯ: собівартість харчування = ціна харчування * коефіцієнт
  MEAL_COST_RATIO: 1.0,
};

// ---------- Вартість кімнат (FR-13) ----------
export const ROOM = {
  ROOM_COST_DEFAULT: 50000, // ПРИПУЩЕННЯ: якщо cost не вказано, береться це значення
};

// ---------- Персонал (розділ 4.3 ТЗ) ----------
export const STAFF_POSITIONS = [
  "admin",
  "manager",
  "teacher",
  "caregiver",
  "assistant",
];

export const SALARY = {
  ADMIN: 0, // ПРИПУЩЕННЯ: власник не отримує зарплату з садка, змініть за потреби
  MANAGER: 80000,
  TEACHER: 40000,
  CAREGIVER_BASE: 40000, // A3
  ASSISTANT_BASE: 40000, // A3
  CAREGIVER_BONUS_PER_EXTRA_CHILD: 5000, // FR-11, за кожну дитину після 12-ї
  ASSISTANT_BONUS_PER_EXTRA_CHILD: 3000, // FR-11
};

// ---------- Розклад (розділ 4.5 ТЗ) ----------
export const SCHEDULE = {
  STAY_HOURS: 8, // FR-17
  NAP_HOURS: 1, // FR-17
  MEALS_PER_DAY: 3, // FR-18
  MEAL_MINUTES: 30, // FR-18
  LESSON_MINUTES: 30, // A4
  DAYS: ["mon", "tue", "wed", "thu", "fri"], // ПРИПУЩЕННЯ: лише робочі дні
  DAY_START: "09:00", // ПРИПУЩЕННЯ: початок занять
  SLOTS_PER_DAY: 8, // ПРИПУЩЕННЯ: 8 слотів по 30 хв на день
  LESSONS_PER_SUBJECT_PER_WEEK: 1, // Підтверджено замовником: кожен гурток 1 раз на тиждень
  MAX_SUBJECT_LESSONS_PER_DAY: 2, // Підтверджено замовником: максимум 2 заняття на день
};

// ---------- Звіти (розділ 4.7 ТЗ) ----------
export const REPORTS = {
  MAX_ROOMS_SEARCH: 50, // ПРИПУЩЕННЯ: верхня межа для пошуку мінімальної кількості кімнат
};
