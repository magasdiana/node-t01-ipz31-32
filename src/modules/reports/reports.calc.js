
// Чисті функції: без бази і без Express. Усі числа приходять параметрами.
// Харчування в прогнозах не враховуємо: це транзит, виручка дорівнює витратам.

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function paymentShareForMonth(payment, month) {
  const data = payment?.data;

  if (!data) return { total: 0, meals: 0 };

  const amount = Number(data.amount) || 0;
  const mealItem = Array.isArray(data.items)
    ? data.items.find((item) => item.name === 'meals' || item.type === 'meal')
    : null;
  const meals = Number(mealItem?.amount) || 0;

  if (data.period === 'year') {
    if (!data.periodStart) return { total: 0, meals: 0 };

    const [sy, sm] = String(data.periodStart).slice(0, 7).split('-').map(Number);
    const [ty, tm] = month.split('-').map(Number);
    const startIndex = sy * 12 + sm - 1;
    const targetIndex = ty * 12 + tm - 1;

    if (targetIndex < startIndex || targetIndex >= startIndex + 12) {
      return { total: 0, meals: 0 };
    }

    return { total: amount / 12, meals: meals / 12 };
  }

  const paymentDate = data.date || data.periodStart || payment.createdAt;

  if (!paymentDate || String(paymentDate).slice(0, 7) !== month) {
    return { total: 0, meals: 0 };
  }

  return { total: amount, meals };
}

// Доплата вихователю й помічнику за групу з n дітей.
// rules: { flatFrom, flatAmount, perChildFrom, perChildEducator, perChildAssistant }
// Без rules доплат немає.
export function calcGroupBonuses(n, rules) {
  if (!rules) return 0;
  let total = 0;
  if (n >= rules.flatFrom) total += rules.flatAmount;
  if (n >= rules.perChildFrom) {
    total += (n - rules.perChildFrom + 1) * (rules.perChildEducator + rules.perChildAssistant);
  }
  return total;
}

// Прибуток = виручка мінус витрати (кімнати, зарплати, надбавки)
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

// Скільки кімнат (груп) потрібно, щоб прибуток груп покрив постійні витрати.
// perRoomCost = кімната + вихователь + помічник (без доплат); доплати рахуємо за bonusRules.
export function minRooms({ childrenPerRoom, netRevenuePerChild, perRoomCost, fixedCosts, bonusRules }) {
  const margin =
    childrenPerRoom * netRevenuePerChild - perRoomCost - calcGroupBonuses(childrenPerRoom, bonusRules);
  if (margin <= 0) {
    return { rooms: null, margin, reason: 'Кімната не окупається: дохід від повної групи не покриває її витрат' };
  }
  return { rooms: Math.max(1, Math.ceil(fixedCosts / margin)), margin, reason: null };
}

// Прибуток при 1, 2, 3... групах; діти беруться найбільшими групами спершу.
// extraTeachers (необов'язково): { groupsPerBlock, blockCost }, тобто кожен додатковий блок
// викладачів, потрібний після groupsPerBlock груп, коштує blockCost.
export function findOptimum({
  groupSizes, netRevenuePerChild, perRoomCost, fixedCosts, maxRooms, bonusRules, extraTeachers,
}) {
  const sizes = [...groupSizes].sort((a, b) => b - a);
  const limit = Math.min(maxRooms, sizes.length);
  const table = [];
  let children = 0;
  let groupsProfit = 0;
  for (let rooms = 1; rooms <= limit; rooms++) {
    const size = sizes[rooms - 1];
    children += size;
    groupsProfit += size * netRevenuePerChild - perRoomCost - calcGroupBonuses(size, bonusRules);
    const extraCost = extraTeachers
      ? (Math.ceil(rooms / extraTeachers.groupsPerBlock) - 1) * extraTeachers.blockCost
      : 0;
    table.push({ rooms, children, profit: groupsProfit - fixedCosts - extraCost });
  }
  if (table.length === 0) {
    return { bestRooms: null, bestChildren: null, plateauChildren: null, table, note: 'Немає дітей для розрахунку' };
  }
  let best = table[0];
  for (const row of table) {
    if (row.profit > best.profit) best = row;
  }
  // плато: перша кількість дітей, після якої наступна група вже не додає прибутку
  let plateauChildren = null;
  for (let i = 0; i < table.length - 1; i++) {
    if (table[i + 1].profit <= table[i].profit) {
      plateauChildren = table[i].children;
      break;
    }
  }
  return {
    bestRooms: best.rooms,
    bestChildren: best.children,
    plateauChildren,
    table,
    note: plateauChildren === null ? 'У межах розрахунку прибуток лише зростає' : null,
  };
}
