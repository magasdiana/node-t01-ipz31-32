
/**
 * Чисті функції: без Prisma та Express.
 */

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function paymentShareForMonth(payment, month) {
  const data = payment?.data;

  if (!data) return { total: 0, meals: 0 };

  const amount = Number(data.amount) || 0;

  const mealItem = Array.isArray(data.items)
    ? data.items.find(
        item => item.name === 'meals' || item.type === 'meal'
      )
    : null;

  const meals = Number(mealItem?.amount) || 0;

  if (data.period === 'year') {
    if (!data.periodStart) return { total: 0, meals: 0 };

    const [sy, sm] = String(data.periodStart)
      .slice(0, 7)
      .split('-')
      .map(Number);

    const [ty, tm] = month.split('-').map(Number);

    const startIndex = sy * 12 + sm - 1;
    const targetIndex = ty * 12 + tm - 1;

    if (
      targetIndex < startIndex ||
      targetIndex >= startIndex + 12
    ) {
      return { total: 0, meals: 0 };
    }

    return {
      total: amount / 12,
      meals: meals / 12,
    };
  }

  const paymentDate =
    data.date || data.periodStart || payment.createdAt;

  if (
    !paymentDate ||
    String(paymentDate).slice(0, 7) !== month
  ) {
    return { total: 0, meals: 0 };
  }

  return { total: amount, meals };
}

export function calcGroupBonuses(n, rules) {
  if (!rules) return 0;

  let total = 0;

  if (n >= rules.flatFrom) {
    total += rules.flatAmount;
  }

  if (n >= rules.perChildFrom) {
    total +=
      (n - rules.perChildFrom + 1) *
      (rules.perChildEducator + rules.perChildAssistant);
  }

  return total;
}

export function calcProfit({ revenue, expenses }) {
  const totalExpenses =
    (Number(expenses.rooms) || 0) +
    (Number(expenses.salaries) || 0) +
    (Number(expenses.allowances) || 0) +
    (Number(expenses.meals) || 0);

  return {
    revenue,
    expenses,
    totalExpenses,
    profit: revenue - totalExpenses,
  };
}

export function minRooms({
  childrenPerRoom,
  netRevenuePerChild,
  perRoomCost,
  fixedCosts,
  bonusRules,
}) {
  const margin =
    childrenPerRoom * netRevenuePerChild -
    perRoomCost -
    calcGroupBonuses(childrenPerRoom, bonusRules);

  if (margin <= 0) {
    return {
      rooms: null,
      margin,
      reason:
        'Кімната не окупається: дохід від повної групи не покриває її витрат',
    };
  }

  return {
    rooms: Math.max(1, Math.ceil(fixedCosts / margin)),
    margin,
    reason: null,
  };
}

/**
 * Спільний пошук оптимуму.
 *
 * Звичайна модель:
 *   groupSizes + netRevenuePerChild + perRoomCost
 *
 * Сценарна модель:
 *   groupRows = [{ children, margin }]
 *
 * В обох випадках групи впорядковуються за кількістю дітей.
 */
export function findOptimum({
  groupSizes = [],
  groupRows,
  netRevenuePerChild,
  perRoomCost,
  fixedCosts,
  maxRooms,
  bonusRules,
  extraTeachers,
}) {
  const rows = groupRows
    ? groupRows.map(row => ({
        children: Number(row.children) || 0,
        margin: Number(row.margin) || 0,
      }))
    : groupSizes.map(size => ({
        children: size,
        margin:
          size * netRevenuePerChild -
          perRoomCost -
          calcGroupBonuses(size, bonusRules),
      }));

  rows.sort((a, b) => b.children - a.children);

  const limit = Math.min(
    maxRooms ?? rows.length,
    rows.length
  );

  const table = [];

  let children = 0;
  let groupsProfit = 0;

  for (let rooms = 1; rooms <= limit; rooms++) {
    const row = rows[rooms - 1];

    children += row.children;
    groupsProfit += row.margin;

    const extraCost = extraTeachers
      ? (
          Math.ceil(rooms / extraTeachers.groupsPerBlock) - 1
        ) * extraTeachers.blockCost
      : 0;

    table.push({
      rooms,
      children,
      profit: round2(
        groupsProfit - fixedCosts - extraCost
      ),
    });
  }

  if (table.length === 0) {
    return {
      maxProfit: null,
      bestRooms: null,
      bestChildren: null,
      plateauRooms: null,
      table,
      note: 'Немає груп для розрахунку',
    };
  }

  let best = table[0];

  for (const row of table) {
    if (row.profit > best.profit) {
      best = row;
    }
  }

  let plateauRooms = null;

  for (let i = 0; i < table.length - 1; i++) {
    if (table[i + 1].profit <= table[i].profit) {
      plateauRooms = table[i].rooms;
      break;
    }
  }

  return {
    maxProfit: best.profit,
    bestRooms: best.rooms,
    bestChildren: best.children,
    plateauRooms,
    table,
    note:
      plateauRooms === null
        ? 'У межах розрахунку прибуток лише зростає'
        : null,
  };
}

/**
 * Сценарний прогноз.
 * Не читає й не змінює БД.
 *
 * profiles[i] — профілі дітей сценарної групи i.
 * Якщо профілю немає: вік 3 роки, пільга 0%.
 */
export function calculateForecast({
  groupSizes,
  profiles,
  prices,
  months,
  fixedCosts,
  roomCost,
  educatorSalary,
  assistantSalary,
  bonusRules,
  workingDays,
  maxRooms,
}) {
  const benefitMap = {
    none: 'NONE',
    min: 'LEVEL_1',
    medium: 'LEVEL_2',
    max: 'LEVEL_3',
  };

  const groupRows = groupSizes.map((size, index) => {
    const children = profiles[index] ?? [];

    let tuition = 0;
    let meals = 0;

    for (let i = 0; i < size; i++) {
      const child = children[i];

      const rawBenefit = String(
        child?.benefitType ?? 'none'
      );

      const benefitKey =
        benefitMap[rawBenefit.toLowerCase()] ??
        rawBenefit;

      const benefit = Number(
        prices.benefitPercent[benefitKey] ?? 0
      );

      const tuitionPrice =
        Number(prices.tuitionMonthly) || 0;

      tuition +=
        tuitionPrice * (1 - benefit / 100);

      const age =
        child?.age === undefined ||
        child?.age === null
          ? 3
          : Number(child.age);

      const mealPrice = Number(
        prices.mealsPerDayByAge[age] ??
        prices.mealsPerDayByAge[3] ??
        0
      );

      meals += mealPrice * workingDays;
    }

    const allowances = calcGroupBonuses(
      size,
      bonusRules
    );

    const salaries =
      educatorSalary + assistantSalary;

    return {
      children: size,
      tuitionRevenue: round2(tuition),
      mealsRevenue: round2(meals),
      roomCosts: roomCost,
      salaries,
      allowances,
    };
  });

  const sumField = key =>
    groupRows.reduce(
      (total, row) => total + row[key],
      0
    );

  const tuitionRevenue = round2(
    sumField('tuitionRevenue')
  );

  const mealsRevenue = round2(
    sumField('mealsRevenue')
  );

  const expenses = {
    fixed: fixedCosts,
    rooms: round2(sumField('roomCosts')),
    salaries: round2(sumField('salaries')),
    allowances: round2(sumField('allowances')),
    meals: mealsRevenue,
  };

  const revenue = round2(
    tuitionRevenue + mealsRevenue
  );

  const costs = round2(
    Object.values(expenses).reduce(
      (total, amount) => total + amount,
      0
    )
  );

  const profit = round2(revenue - costs);

  // Використовуємо єдиний алгоритм пошуку оптимуму.
  // Харчування входить і в дохід, і у витрати,
  // тому його чистий внесок у margin дорівнює 0.
  const optimum = findOptimum({
    groupRows: groupRows.map(row => ({
      children: row.children,
      margin: round2(
        row.tuitionRevenue -
        row.roomCosts -
        row.salaries -
        row.allowances
      ),
    })),
    fixedCosts,
    maxRooms,
  });

  const monthRows = Array.from(
    { length: months },
    (_, index) => ({
      month: index + 1,
      revenue,
      costs,
      profit,
    })
  );

  return {
    months: monthRows,

    total: {
      revenue: round2(revenue * months),
      costs: round2(costs * months),
      profit: round2(profit * months),
    },

    optimum,

    breakdown: {
      tuitionRevenue,
      mealsRevenue,
      expenses,
    },
  };
}
