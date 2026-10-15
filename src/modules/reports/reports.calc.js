// Прибуток = виручка мінус витрати (кімнати, зарплати, надбавки, харчування)
export function calcProfit({ revenue, expenses }) {
const totalExpenses =
    expenses.rooms + expenses.salaries + expenses.allowances + expenses.meals;
return { revenue, expenses, totalExpenses, profit: revenue - totalExpenses };
}

// Скільки кімнат потрібно, щоб покрити постійні витрати
export function minRooms({ childrenPerRoom, netRevenuePerChild, perRoomCost, fixedCosts }) {
  const margin = childrenPerRoom * netRevenuePerChild - perRoomCost;
if (margin <= 0) {
    return { rooms: null, margin, reason: 'Кімната не окупається: дохід від повної групи не покриває її витрат' };
    }
return { rooms: Math.max(1, Math.ceil(fixedCosts / margin)), margin, reason: null };
}

// Прибуток при 1, 2, 3... кімнатах; діти беруться найбільшими групами спершу
export function findOptimum({ groupSizes, netRevenuePerChild, perRoomCost, fixedCosts, maxRooms }) {
const sizes = [...groupSizes].sort((a, b) => b - a);
const limit = Math.min(maxRooms, sizes.length);
const table = [];
let children = 0;
for (let rooms = 1; rooms <= limit; rooms++) {
    children += sizes[rooms - 1];
    const profit = children * netRevenuePerChild - fixedCosts - rooms * perRoomCost;
    table.push({ rooms, children, profit });
    }
if (table.length === 0) {
    return { bestRooms: null, bestChildren: null, plateauChildren: null, table, note: 'Немає дітей для розрахунку' };
    }
let best = table[0];
for (const row of table) {
    if (row.profit > best.profit) best = row;
    }
  // плато: перша кількість дітей, після якої наступна кімната вже не додає прибутку
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