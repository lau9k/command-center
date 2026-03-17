import { TasksSubNav } from "@/components/tasks/tasks-sub-nav";

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <TasksSubNav />
      {children}
    </div>
  );
}
