import React, { useState } from "react";
import { Sliders } from "lucide-react";
import { calcDailyPayout, getNextTier, getTierForRevenue } from "./tierUtils";

export default function PayoutSimulator({ todayRevenue, hoursWorked, monthRevenue, monthlyGoalAmount, monthlyGoalEnabled, tiers }) {
  const [extraRevenue, setExtraRevenue] = useState(0);
  const [extraHours, setExtraHours] = useState(0);

  const simRevenue = todayRevenue + (Number(extraRevenue) || 0);
  const simHours = hoursWorked + (Number(extraHours) || 0);
  const { payout: simPayout, basePay: simBase, commissionPay: simComm } = calcDailyPayout(simRevenue, simHours, tiers);
  const { payout: currentPayout } = calcDailyPayout(todayRevenue, hoursWorked, tiers);
  const simTier = getTierForRevenue(simRevenue, tiers);
  const simNext = getNextTier(simRevenue, tiers);
  const payoutDiff = simPayout - currentPayout;

  const getTip = () => {
    const nextT = getNextTier(todayRevenue, tiers);
    if (!nextT) return "Jsi na maximálním tieru. Každá další platba jde s 10% provizí.";
    const needed = nextT.min - todayRevenue;
    return `Přidej ${needed.toLocaleString()} Kč a odemkneš tier: ${nextT.name}`;
  };

  return null;





























































}