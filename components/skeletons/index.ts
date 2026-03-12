/**
 * Skeleton components for loading states.
 *
 * Re-exports core skeletons from dashboard/LoadingSkeleton and adds
 * additional composite skeletons (CardGridSkeleton, ChartSkeleton).
 */

export {
  Skeleton,
  KPICardSkeleton,
  KPIStripSkeleton,
  TableSkeleton,
  KanbanSkeleton,
  CardSkeleton,
  DashboardSkeleton,
  PageSkeleton,
  FinanceSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export { CardGridSkeleton } from "./CardGridSkeleton";
export { ChartSkeleton } from "./ChartSkeleton";
