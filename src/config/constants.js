// Усі значення в грн/міс, якщо не вказано інше.
// Значення A1-A4 — припущення з ТЗ, їх треба затвердити (розділ 9 ТЗ).

export const PRICES = {
  TUITION_MONTHLY: 15000, // FR-23
  ROOM_MONTHLY: 50000, // FR-13
  // FR-25: харчування за день залежно від віку
  MEALS_PER_DAY_BY_AGE: { 2: 300, 3: 400, 4: 500, 5: 600 },
};

export const SALARY = {
  TEACHER: 40000, // таблиця 4.3
  MANAGER: 80000,
  CAREGIVER_BASE: 40000, // A3: дорівнює зарплаті викладача
  ASSISTANT_BASE: 40000, // A3
  CAREGIVER_BONUS_PER_EXTRA_CHILD: 5000, // FR-11
  ASSISTANT_BONUS_PER_EXTRA_CHILD: 3000, // FR-11
};

export const LIMITS = {
  GROUP_MAX_CHILDREN: 20, // FR-08, жорстка межа
  BONUS_THRESHOLD_CHILDREN: 12, // FR-11, доплата починається після 12-ї дитини
  CHILD_AGE_MIN: 2, // FR-01
  CHILD_AGE_MAX: 5,
  TEACHERS_PER_SUBJECT: 3, // FR-15
  TEACHER_MAX_MULTIPLIER: 3, // FR-16
};

export const DISCOUNTS = {
  BENEFIT: { LEVEL_1: 0.1, LEVEL_2: 0.2, LEVEL_3: 0.3 }, // FR-24
  ANNUAL_PAYMENT: 0.12, // FR-26
};

export const SCHEDULE = {
  STAY_HOURS: 8, // FR-17
  NAP_HOURS: 1,
  MEALS_PER_DAY: 3, // FR-18
  MEAL_MINUTES: 30,
};

export const ASSUMPTIONS = {
  A1_WORKING_DAYS_PER_MONTH: 22, // для розрахунку харчування
  A2_DISCOUNT_MODE: "multiplicative", // знижки множаться, не складаються
  A3_BASE_STAFF_SALARY: 40000, // = зарплата викладача
  A4_LESSON_MINUTES: 30, // тривалість одного уроку
};
