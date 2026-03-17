import {
  CheckSquare,
  Users,
  TrendingUp,
  FileText,
  DollarSign,
  FolderOpen,
  Award,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface ModuleEmptyStateConfig {
  icon: LucideIcon
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  secondaryLabel?: string
  secondaryHref?: string
}

const moduleEmptyStates: Record<string, ModuleEmptyStateConfig> = {
  tasks: {
    icon: CheckSquare,
    title: "No tasks yet",
    description:
      "Tasks help you track work across all your projects. Create your first task to start organizing your workflow.",
    ctaLabel: "Create your first task",
    ctaHref: "/tasks",
  },
  contacts: {
    icon: Users,
    title: "No contacts yet",
    description:
      "Build your network by adding contacts. Import from a spreadsheet or create them one by one.",
    ctaLabel: "Add a contact",
    ctaHref: "/contacts",
    secondaryLabel: "Import contacts",
    secondaryHref: "/contacts/import",
  },
  pipeline: {
    icon: TrendingUp,
    title: "No deals in your pipeline",
    description:
      "Track opportunities from first contact to close. Add a deal to start managing your sales pipeline.",
    ctaLabel: "Add your first deal",
    ctaHref: "/pipeline",
  },
  content: {
    icon: FileText,
    title: "No content scheduled",
    description:
      "Plan and schedule posts across your social channels. Draft your first piece of content to get started.",
    ctaLabel: "Create a post",
    ctaHref: "/content",
  },
  finance: {
    icon: DollarSign,
    title: "No transactions recorded",
    description:
      "Track income, expenses, and invoices in one place. Add a transaction to start monitoring your finances.",
    ctaLabel: "Add a transaction",
    ctaHref: "/finance",
  },
  resources: {
    icon: FolderOpen,
    title: "No resources uploaded",
    description:
      "Store files, documents, and links for easy access across your projects.",
    ctaLabel: "Upload a file",
    ctaHref: "/resources",
  },
  sponsors: {
    icon: Award,
    title: "No sponsors yet",
    description:
      "Manage sponsor relationships from outreach to confirmation. Add your first sponsor to start tracking partnerships.",
    ctaLabel: "Add a sponsor",
    ctaHref: "/sponsors",
  },
} as const

export { moduleEmptyStates }
export type { ModuleEmptyStateConfig }
