export type {
  ScheduledFlow,
  ForecastRun,
  ForecastResult,
  ForecastDayPoint,
  ForecastTransform,
  FlowDirection,
  FlowCadence,
} from "@/lib/types/database";

/** What-if scenario type */
export type WhatIfType = "delay_payment" | "cut_expense" | "add_income" | "add_recurring";

/** What-if form state */
export interface WhatIfForm {
  type: WhatIfType;
  flowName: string;
  delayDays: number;
  factor: number;
  amount: number;
  name: string;
  direction: "inflow" | "outflow";
  cadence: "monthly" | "biweekly" | "weekly" | "one_time";
  date: string;
}

export const INITIAL_WHATIF: WhatIfForm = {
  type: "delay_payment",
  flowName: "",
  delayDays: 7,
  factor: 0.8,
  amount: 0,
  name: "",
  direction: "inflow",
  cadence: "monthly",
  date: "",
};

/** Format CAD currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
