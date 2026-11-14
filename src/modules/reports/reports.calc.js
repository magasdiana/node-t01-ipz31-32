// Чисті функції: без бази даних і Express.

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
      .slice(0, 7).split('-').map(Number);
    const [ty, tm] = month.split('-').map(Number);

    const startIndex = sy * 12 + sm - 1;
    const targetIndex = ty * 12 + tm - 1;

    if (targetIndex < startIndex || targetIndex >= startIndex + 12) {
      return { total: 0, meals: 0 };
    }

    return { total: amount / 12, meals: meals / 12 };
  }

  const paymentDate =
    data.date || data.periodStart || payment.createdAt;

  if (!paymentDate || String(paymentDate).slice(0, 7) !== month) {
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
    total += (n - rules.perChildFrom + 1) *
      (rules.perChildEducator + rules.perChildAssistant);
  }

  return total;
}

export function calcProfit({ revenue, expenses }) {
  const totalExpenses =
    expenses.rooms +
    expenses.salaries +
    expenses.allowances;

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

export function findOptimum({
  groupSizes,
  netRevenuePerChild,
  perRoomCost,
  fixedCosts,
  maxRooms,
  bonusRules,
  extraTeachers,
}) {
  const sizes = [...groupSizes].sort((a, b) => b - a);
  const limit = Math.min(maxRooms, sizes.length);

  const table = [];
  let children = 0;
  let groupsProfit = 0;

  for (let rooms = 1; rooms <= limit; rooms++) {
    const size = sizes[rooms - 1];

    children += size;

    groupsProfit +=
      size * netRevenuePerChild -
      perRoomCost -
      calcGroupBonuses(size, bonusRules);

    const extraCost = extraTeachers
      ? (Math.ceil(rooms / extraTeachers.groupsPerBlock) - 1) *
        extraTeachers.blockCost
      : 0;

    table.push({
      rooms,
      children,
      profit: groupsProfit - fixedCosts - extraCost,
    });
  }

  if (table.length === 0) {
    return {
      maxProfit: null,
      bestRooms: null,
      bestChildren: null,
      plateauRooms: null,
      table,
      note: 'Немає дітей для розрахунку',
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
    bestRooms: best.rooms,
    bestChildren: best.children,
    maxProfit: best.profit,
    plateauRooms,
    table,
    note: plateauRooms === null
      ? 'У межах розрахунку прибуток лише зростає'
      : null,
  };
}

// Сценарний прогноз. Не читає й не змінює БД.
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
  const groupRows = groupSizes.map((size, index) => {
    const children = profiles[index] ?? [];

    let tuition = 0;
    let meals = 0;

    for (let i = 0; i < size; i++) {
      const child = children[i] ?? {
        age: 3,
        benefitType: 'none',
      };

      const benefitMap = {
        none: 'NONE',
        min: 'LEVEL_1',
        medium: 'LEVEL_2',
        max: 'LEVEL_3',
      };

      const benefitKey =
        benefitMap[
          String(child.benefitType ?? 'none').toLowerCase()
        ] ?? child.benefitType;

      const benefit = Number(
        prices.benefitPercent[benefitKey] ?? 0
      );

      tuition += prices.tuitionMonthly * (1 - benefit / 100);

      const age = Number(child.age);

      meals += Number(
        prices.mealsPerDayByAge[age] ??
        prices.mealsPerDayByAge[3]
      ) * workingDays;
    }

    return {
      rooms: 1,
      children: size,
      tuitionRevenue: round2(tuition),
      mealsRevenue: round2(meals),
      roomCosts: roomCost,
      salaries: educatorSalary + assistantSalary,
      allowances: calcGroupBonuses(size, bonusRules),
    };
  });

  const table = [];

  for (
    let rooms = 1;
    rooms <= Math.min(maxRooms, groupRows.length);
    rooms++
  ) {
    const selected = groupRows.slice(0, rooms);

    const total = key =>
      selected.reduce((acc, row) => acc + row[key], 0);

    const tuition = total('tuitionRevenue');
    const meals = total('mealsRevenue');
    const roomCosts = total('roomCosts');
    const salaries = total('salaries');
    const allowances = total('allowances');

    const costs =
      fixedCosts +
      roomCosts +
      salaries +
      allowances +
      meals;

    table.push({
      rooms,
      children: total('children'),
      profit: round2(tuition + meals - costs),
    });
  }

  let best = table[0] ?? null;

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

  const tuitionRevenue = round2(
    groupRows.reduce(
      (acc, row) => acc + row.tuitionRevenue,
      0
    )
  );

  const mealsRevenue = round2(
    groupRows.reduce(
      (acc, row) => acc + row.mealsRevenue,
      0
    )
  );

  const expenses = {
    fixed: fixedCosts,
    rooms: groupRows.reduce(
      (acc, row) => acc + row.roomCosts,
      0
    ),
    salaries: groupRows.reduce(
      (acc, row) => acc + row.salaries,
      0
    ),
    allowances: groupRows.reduce(
      (acc, row) => acc + row.allowances,
      0
    ),
    meals: mealsRevenue,
  };

  const revenue = round2(tuitionRevenue + mealsRevenue);

  const costs = round2(
    Object.values(expenses).reduce(
      (a, b) => a + b,
      0
    )
  );

  const profit = round2(revenue - costs);

  const monthRows = Array.from(
    { length: months },
    (_, i) => ({
      month: i + 1,
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

    optimum: {
      maxProfit: best?.profit ?? null,
      bestRooms: best?.rooms ?? null,
      bestChildren: best?.children ?? null,
      plateauRooms,
      table,
      note: plateauRooms === null
        ? 'У межах сценарію прибуток лише зростає або є одна група'
        : null,
    },

    breakdown: {
      tuitionRevenue,
      mealsRevenue,
      expenses,
    },
  };
}