// Default tiers — used when no custom rule is set
export const DEFAULT_TIERS = [
  { name: "No payout", min: 0, max: 1999, hourly: 0, commission: 0 },
  { name: "120 CZK/h", min: 2000, max: 4999, hourly: 120, commission: 0 },
  { name: "120 CZK/h + 5 %", min: 5000, max: 9999, hourly: 120, commission: 5 },
  { name: "120 CZK/h + 10 %", min: 10000, max: null, hourly: 120, commission: 10 },
];

export function getTierForRevenue(revenue, tiers = DEFAULT_TIERS) {
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (revenue >= tiers[i].min) return { ...tiers[i], index: i };
  }
  return { ...tiers[0], index: 0 };
}

export function calcDailyPayout(revenue, hoursWorked, tiers = DEFAULT_TIERS) {
  const tier = getTierForRevenue(revenue, tiers);
  if (tier.hourly === 0) return { payout: 0, basePay: 0, commissionPay: 0, tier };
  const basePay = hoursWorked * tier.hourly;
  const commissionPay = tier.commission > 0 ? revenue * (tier.commission / 100) : 0;
  return { payout: basePay + commissionPay, basePay, commissionPay, tier };
}

export function getNextTier(revenue, tiers = DEFAULT_TIERS) {
  const current = getTierForRevenue(revenue, tiers);
  const nextIndex = current.index + 1;
  if (nextIndex >= tiers.length) return null;
  return { ...tiers[nextIndex], index: nextIndex };
}

export function calcMonthlyPayoutFromDays(dailyPerformances, tiers = DEFAULT_TIERS) {
  return dailyPerformances.reduce((sum, day) => {
    const { payout } = calcDailyPayout(day.revenue || 0, day.hours_worked || 0, tiers);
    return sum + payout;
  }, 0);
}

// Group payments by date
export function groupPaymentsByDate(payments) {
  const map = {};
  payments.forEach((p) => {
    const date = p.payment_date || p.created_date?.split("T")[0];
    if (!date) return;
    if (!map[date]) map[date] = { date, revenue: 0, payments: [] };
    map[date].revenue += p.amount || 0;
    map[date].payments.push(p);
  });
  return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
}