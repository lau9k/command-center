import {
  PageSkeleton,
  TableSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function TasksLoading() {
  return (
    <PageSkeleton>
      <TableSkeleton rows={6} columns={5} />
    </PageSkeleton>
  );
}
