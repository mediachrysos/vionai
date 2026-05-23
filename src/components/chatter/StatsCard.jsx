import React from "react";
import { TrendingUp } from "lucide-react";

export default function StatsCard({ todayRevenue, hoursWorked, nextTierRevenue }) {
  const progressPercent = nextTierRevenue > 0 ? Math.min(todayRevenue / nextTierRevenue * 100, 100) : 0;

  return null;




















}