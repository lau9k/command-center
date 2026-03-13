import {
  PageSkeleton,
  TableSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function ContactsLoading() {
  return (
    <PageSkeleton>
      <TableSkeleton rows={6} columns={6} />
    </PageSkeleton>
  );
}
