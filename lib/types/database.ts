export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type ContactStatus = "active" | "inactive" | "lead" | "customer";
export type ContactSource = "manual" | "referral" | "website" | "linkedin" | "other";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithProject extends Task {
  projects: Pick<Project, "id" | "name" | "color"> | null;
}

export interface Contact {
  id: string;
  project_id: string;
  name: string;
  email: string | null;
  company: string | null;
  source: ContactSource;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
}

export interface PipelineItem {
  id: string;
  project_id: string;
  title: string;
  stage: string;
  value: number | null;
  created_at: string;
  updated_at: string;
}
