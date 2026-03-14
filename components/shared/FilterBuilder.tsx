"use client";

import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterCondition, FilterOperator } from "@/lib/filters";
import { OPERATOR_LABELS, OPERATORS_BY_TYPE } from "@/lib/filters";
import type { FieldDefinition } from "@/components/shared/FilterBar";

interface FilterRow {
  field: string;
  operator: FilterOperator;
  value: string;
}

interface FilterBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FieldDefinition[];
  entityType: string;
  initialFilters?: FilterCondition[];
  onApply: (filters: FilterCondition[]) => void;
  onSaveAsView?: (name: string, filters: FilterCondition[]) => void;
}

function emptyRow(): FilterRow {
  return { field: "", operator: "eq", value: "" };
}

function conditionToRow(condition: FilterCondition): FilterRow {
  let value = "";
  if (condition.operator === "is_null" || condition.operator === "is_not_null") {
    value = "";
  } else if (Array.isArray(condition.value)) {
    value = condition.value.join(", ");
  } else if (condition.value !== null && condition.value !== undefined) {
    value = String(condition.value);
  }
  return {
    field: condition.field,
    operator: condition.operator,
    value,
  };
}

function rowToCondition(
  row: FilterRow,
  fields: FieldDefinition[]
): FilterCondition | null {
  if (!row.field || !row.operator) return null;

  const fieldDef = fields.find((f) => f.id === row.field);

  if (row.operator === "is_null" || row.operator === "is_not_null") {
    return { field: row.field, operator: row.operator, value: null };
  }

  if (!row.value.trim()) return null;

  let parsedValue: FilterCondition["value"] = row.value;
  if (fieldDef?.type === "number") {
    const num = Number(row.value);
    if (isNaN(num)) return null;
    parsedValue = num;
  }
  if (row.operator === "in") {
    parsedValue = row.value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return { field: row.field, operator: row.operator, value: parsedValue };
}

export function FilterBuilder({
  open,
  onOpenChange,
  fields,
  initialFilters = [],
  onApply,
  onSaveAsView,
}: FilterBuilderProps) {
  const [rows, setRows] = useState<FilterRow[]>(() =>
    initialFilters.length > 0
      ? initialFilters.map(conditionToRow)
      : [emptyRow()]
  );
  const [viewName, setViewName] = useState("");
  const [showSaveName, setShowSaveName] = useState(false);

  function updateRow(index: number, updates: Partial<FilterRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [emptyRow()] : next;
    });
  }

  function buildFilters(): FilterCondition[] {
    return rows
      .map((row) => rowToCondition(row, fields))
      .filter((f): f is FilterCondition => f !== null);
  }

  function handleApply() {
    onApply(buildFilters());
    onOpenChange(false);
  }

  function handleSaveAsView() {
    if (!viewName.trim() || !onSaveAsView) return;
    onSaveAsView(viewName.trim(), buildFilters());
    setViewName("");
    setShowSaveName(false);
    onOpenChange(false);
  }

  function getOperatorsForField(fieldId: string): FilterOperator[] {
    const fieldDef = fields.find((f) => f.id === fieldId);
    if (!fieldDef) return OPERATORS_BY_TYPE.text;
    return OPERATORS_BY_TYPE[fieldDef.type] ?? OPERATORS_BY_TYPE.text;
  }

  function needsValue(operator: FilterOperator): boolean {
    return operator !== "is_null" && operator !== "is_not_null";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Build Filters</DialogTitle>
          <DialogDescription>
            Add filter conditions to narrow down your results.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto py-2">
          {rows.map((row, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Field</Label>
                <Select
                  value={row.field}
                  onValueChange={(val) =>
                    updateRow(index, {
                      field: val,
                      operator: "eq",
                      value: "",
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full space-y-1 sm:w-36">
                <Label className="text-xs text-muted-foreground">
                  Condition
                </Label>
                <Select
                  value={row.operator}
                  onValueChange={(val) =>
                    updateRow(index, { operator: val as FilterOperator })
                  }
                  disabled={!row.field}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getOperatorsForField(row.field).map((op) => (
                      <SelectItem key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {needsValue(row.operator) && (
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Value</Label>
                  {(() => {
                    const fieldDef = fields.find((f) => f.id === row.field);
                    if (
                      fieldDef?.type === "enum" &&
                      fieldDef.options &&
                      row.operator !== "in"
                    ) {
                      return (
                        <Select
                          value={row.value}
                          onValueChange={(val) =>
                            updateRow(index, { value: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldDef.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }
                    return (
                      <Input
                        type={
                          fieldDef?.type === "number"
                            ? "number"
                            : fieldDef?.type === "date"
                              ? "date"
                              : "text"
                        }
                        placeholder={
                          row.operator === "in"
                            ? "value1, value2, ..."
                            : "Enter value..."
                        }
                        value={row.value}
                        onChange={(e) =>
                          updateRow(index, { value: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    );
                  })()}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRow(index)}
                className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            className="w-full"
          >
            <Plus className="size-4" />
            Add condition
          </Button>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {showSaveName && onSaveAsView ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveAsView();
              }}
              className="flex flex-1 items-center gap-2"
            >
              <Input
                autoFocus
                placeholder="View name..."
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!viewName.trim()}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSaveName(false);
                  setViewName("");
                }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <>
              {onSaveAsView && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveName(true)}
                  className="mr-auto"
                >
                  <Save className="size-4" />
                  Save as view
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply filters
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
