
// Усі гроші в грн/міс, якщо не вказано інше.
// Позначка ПРИПУЩЕННЯ: значення не з ТЗ, потрібне рішення BA/власника.

// ---------- Ліміти (розділ 4 ТЗ) ----------
export const LIMITS = {
  GROUP_MAX_CHILDREN: 20,
  BONUS_THRESHOLD_CHILDREN: 12,
  CHILD_AGE_MIN: 2,
  CHILD_AGE_MAX: 5,
  PARENTS_MAX: 3,
  TEACHERS_PER_SUBJECT: 3,
  TEACHER_MAX_MULTIPLIER: 3,
};

// ---------- Бізнес-правила A1-A4 ----------
export const ASSUMPTIONS = {
  A1_WORKING_DAYS_PER_MONTH: 22,
  A2_DISCOUNT_MODE: 'multiplicative',
  A3_BASE_STAFF_SALARY: 40000,
  A4_LESSON_MINUTES: 30,
};

 export const DEFAULT_PRICES = {
  tuitionMonthly: 15000, // FR-23, навчання без харчування 
  mealsPerDayByAge: { 2: 300, 3: 400, 4: 500, 5: 600 }, // FR-25: харчування за день залежно від віку
  benefitPercent: { NONE: 0, LEVEL_1: 10, LEVEL_2: 20, LEVEL_3: 30 }, // FR-24: пільги у відсотках (10/20/30). NONE = без пільги
  annualPaymentPercent: 12, // FR-26 
  discountAppliesTo: "tuition", // Підтверджено замовником: знижки діють лише на навчання, харчування без знижок
  mealCostRatio: 1.0, // Підтверджено: харчування транзитне (витрати дорівнюють виручці)
};

// ---------- Вартість кімнат ----------
export const ROOM = {
  ROOM_COST_DEFAULT: 50000, // Затверджене рішення BA: базова вартість оренди кімнати за замовчуванням
};

// ---------- Персонал ----------
export const STAFF_POSITIONS = [
  'admin',
  'manager',
  'teacher',
  'educator',
  'assistant',
];

export const SALARY = {
  ADMIN: 0,
  MANAGER: 80000,
  TEACHER: 40000,
  EDUCATOR_BASE: 40000,
  ASSISTANT_BASE: 40000,
  EDUCATOR_BONUS_PER_EXTRA_CHILD: 5000,
  ASSISTANT_BONUS_PER_EXTRA_CHILD: 3000,
};

// ---------- Доплати групам ----------
export const GROUP_BONUS_RULES = {
  flatFrom: LIMITS.BONUS_THRESHOLD_CHILDREN,
  flatAmount: 15000,
  perChildFrom: LIMITS.BONUS_THRESHOLD_CHILDREN + 1,
  perChildEducator: SALARY.EDUCATOR_BONUS_PER_EXTRA_CHILD,
  perChildAssistant: SALARY.ASSISTANT_BONUS_PER_EXTRA_CHILD,
};

// ---------- Розклад ----------
export const SCHEDULE = {
  STAY_HOURS: 8, // FR-17
  NAP_HOURS: 1, // FR-17
  MEALS_PER_DAY: 3, // FR-18
  MEAL_MINUTES: 30, // FR-18
  LESSON_MINUTES: 30, // A4
  DAYS: ["mon", "tue", "wed", "thu", "fri"], // Затверджене рішення BA: робочі дні тижня (пн–пт)
  DAY_START: "09:00", // Затверджене рішення BA: час початку роботи / розкладу
  FIXED_BREAKS: [
    { name: 'meal_1', start: '09:30', minutes: 30 },
    { name: 'meal_2', start: '12:00', minutes: 30 },
    { name: 'nap', start: '13:00', minutes: 60 },
    { name: 'meal_3', start: '15:30', minutes: 30 },
  ],
  LESSONS_PER_SUBJECT_PER_WEEK: 1,
  MAX_SUBJECT_LESSONS_PER_DAY: 2,
};

// ---------- Звіти ----------
export const REPORTS = {
  MAX_ROOMS_SEARCH: 50, // Затверджене рішення BA: верхня межа для алгоритму пошуку мінімальної кількості кімнат
};
