import { lazy } from "react";

// ---------------------------------------------------------------------------
// Analytics (AnalyticsOverview & AnalyticsDashboard have default exports)
// ---------------------------------------------------------------------------
export const LazyAnalyticsOverview = lazy(
  () => import("@/components/analytics/AnalyticsOverview")
);

export const LazyAnalyticsDashboard = lazy(
  () => import("@/components/analytics/AnalyticsDashboard")
);

export const LazyTrendCharts = lazy(() =>
  import("@/components/analytics/TrendCharts").then((m) => ({
    default: m.TrendCharts,
  }))
);

export const LazyPipelineFunnel = lazy(() =>
  import("@/components/analytics/PipelineFunnel").then((m) => ({
    default: m.PipelineFunnel,
  }))
);

// ---------------------------------------------------------------------------
// Sponsors
// ---------------------------------------------------------------------------
export const LazySponsorROI = lazy(() =>
  import("@/components/sponsors/SponsorROI").then((m) => ({
    default: m.SponsorROI,
  }))
);

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
export const LazyConversionFunnel = lazy(() =>
  import("@/components/pipeline/ConversionFunnel").then((m) => ({
    default: m.ConversionFunnel,
  }))
);

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------
export const LazyFinanceCharts = lazy(() =>
  import("@/components/finance/FinanceCharts").then((m) => ({
    default: m.FinanceCharts,
  }))
);

export const LazyForecastCharts = lazy(() =>
  import("@/components/finance/forecast/ForecastCharts").then((m) => ({
    default: m.ForecastCharts,
  }))
);

export const LazyTreasuryDashboard = lazy(() =>
  import("@/components/finance/TreasuryDashboard").then((m) => ({
    default: m.TreasuryDashboard,
  }))
);

// ---------------------------------------------------------------------------
// Home widgets
// ---------------------------------------------------------------------------
export const LazyKPIStripLive = lazy(() =>
  import("@/components/home/KPIStripLive").then((m) => ({
    default: m.KPIStripLive,
  }))
);

export const LazyFinanceSummaryWidget = lazy(() =>
  import("@/components/home/FinanceSummaryWidget").then((m) => ({
    default: m.FinanceSummaryWidget,
  }))
);

// ---------------------------------------------------------------------------
// Community & Sync
// ---------------------------------------------------------------------------
export const LazyGrowthChart = lazy(() =>
  import("@/components/community/GrowthChart").then((m) => ({
    default: m.GrowthChart,
  }))
);

export const LazySyncFrequencyChart = lazy(() =>
  import("@/components/sync/SyncFrequencyChart").then((m) => ({
    default: m.SyncFrequencyChartInner,
  }))
);
