"use client";

const SAMPLE_DATA: Record<string, string> = {
  sponsor_name: "Acme Corp",
  event_name: "TechConf 2026",
  tier: "Gold",
  benefits: "Logo placement, VIP access, keynote slot",
  contact_name: "Jane Smith",
  company: "Acme Corp",
  date: "March 25, 2026",
  first_name: "Jane",
  last_name: "Smith",
  email: "jane@acme.com",
  phone: "(555) 123-4567",
  amount: "$5,000",
  deadline: "April 1, 2026",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderWithSampleData(template: string): string {
  if (!template) return "";
  let result = escapeHtml(template);
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
    const value = SAMPLE_DATA[varName] ?? varName;
    return `<span class="rounded bg-sidebar-primary/20 px-1 text-sidebar-primary font-medium">${escapeHtml(value)}</span>`;
  });
  return result;
}

interface TemplatePreviewProps {
  subject: string;
  body: string;
}

export function TemplatePreview({ subject, body }: TemplatePreviewProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Subject
        </p>
        {subject ? (
          <p
            className="text-sm font-medium text-foreground"
            dangerouslySetInnerHTML={{ __html: renderWithSampleData(subject) }}
          />
        ) : (
          <p className="text-sm italic text-muted-foreground">No subject</p>
        )}
      </div>
      <div className="h-px bg-border" />
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Body
        </p>
        {body ? (
          <div
            className="whitespace-pre-wrap text-sm text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderWithSampleData(body) }}
          />
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No body content
          </p>
        )}
      </div>
    </div>
  );
}
