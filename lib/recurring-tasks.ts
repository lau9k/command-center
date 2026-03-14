import { addDays, addWeeks, addMonths, isWeekend, nextMonday } from "date-fns";

interface TaskRow {
  id: string;
  project_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  assignee: string | null;
  tags: string[] | null;
  recurrence_rule: string | null;
  is_recurring_template: boolean;
}

interface NewTaskInsert {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string | null;
  user_id: string;
  assignee: string | null;
  tags: string[] | null;
  recurrence_rule: string | null;
  recurrence_parent_id: string;
  is_recurring_template: boolean;
}

/** Compute the next due date based on recurrence rule */
function computeNextDueDate(
  currentDueDate: string | null,
  rule: string
): string | null {
  const base = currentDueDate ? new Date(currentDueDate) : new Date();

  switch (rule) {
    case "daily":
      return addDays(base, 1).toISOString();
    case "weekly":
      return addWeeks(base, 1).toISOString();
    case "weekdays": {
      const next = addDays(base, 1);
      return isWeekend(next) ? nextMonday(next).toISOString() : next.toISOString();
    }
    case "monthly":
      return addMonths(base, 1).toISOString();
    default:
      return null;
  }
}

/** Generate the next occurrence of a recurring task. Returns an insert-ready object. */
export function generateNextOccurrence(template: TaskRow): NewTaskInsert {
  const rule = template.recurrence_rule;
  if (!rule) {
    throw new Error("Task has no recurrence rule");
  }

  const templateId = template.is_recurring_template
    ? template.id
    : template.id;

  return {
    title: template.title,
    description: template.description,
    status: "todo",
    priority: template.priority,
    due_date: computeNextDueDate(template.due_date, rule),
    project_id: template.project_id,
    user_id: template.user_id,
    assignee: template.assignee,
    tags: template.tags,
    recurrence_rule: rule,
    recurrence_parent_id: templateId,
    is_recurring_template: false,
  };
}

/** Calculate the next run date from a given date and recurrence rule (for display purposes) */
export function getNextRunDate(
  lastDate: string | null,
  rule: string | null
): string | null {
  if (!rule) return null;
  return computeNextDueDate(lastDate, rule);
}
