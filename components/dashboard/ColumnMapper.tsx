"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface FieldDefinition {
  value: string;
  label: string;
  required?: boolean;
}

interface ColumnMapperProps {
  csvHeaders: string[];
  fields: FieldDefinition[];
  mapping: Record<string, string>;
  onMappingChange: (csvCol: string, dbField: string) => void;
  sampleRow?: Record<string, string>;
  skipValue?: string;
}

const DEFAULT_SKIP = "__skip__";

export function ColumnMapper({
  csvHeaders,
  fields,
  mapping,
  onMappingChange,
  sampleRow,
  skipValue = DEFAULT_SKIP,
}: ColumnMapperProps) {
  const usedFields = new Set(
    Object.values(mapping).filter((v) => v !== skipValue)
  );
  const requiredFields = fields.filter((f) => f.required);
  const mappedRequired = requiredFields.filter((f) => usedFields.has(f.value));

  return (
    <div className="space-y-4">
      {requiredFields.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Required fields:</span>
          {requiredFields.map((f) => (
            <Badge
              key={f.value}
              variant={usedFields.has(f.value) ? "default" : "destructive"}
              className="text-xs"
            >
              {f.label}
            </Badge>
          ))}
          <span className="ml-auto text-muted-foreground">
            {mappedRequired.length}/{requiredFields.length} mapped
          </span>
        </div>
      )}

      <div className="space-y-3">
        {csvHeaders.map((header) => (
          <div key={header} className="flex items-center gap-4">
            <div className="w-1/3 truncate text-sm font-medium">{header}</div>
            <span className="text-muted-foreground">&rarr;</span>
            <div className="w-1/3">
              <Select
                value={mapping[header] ?? skipValue}
                onValueChange={(v) => onMappingChange(header, v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={skipValue}>-- Skip --</SelectItem>
                  {fields.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                      {field.required ? " *" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-1/4 truncate text-xs text-muted-foreground">
              {sampleRow?.[header] ?? ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
