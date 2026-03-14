"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, X, SlidersHorizontal, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FilterCondition, FilterOperator, SavedView } from "@/lib/filters";
import {
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  filtersToSearchParams,
  filtersFromSearchParams,
} from "@/lib/filters";
import { useActiveView } from "@/hooks/useActiveView";
import { SavedViewsDropdown } from "@/components/shared/SavedViewsDropdown";
import { FilterBuilder } from "@/components/shared/FilterBuilder";

// ── Field definition for a filterable entity ──────────────

export interface FieldDefinition {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "enum" | "boolean";
  options?: { label: string; value: string }[];
}

interface SmartFilterBarProps {
  entityType: string;
  fields: FieldDefinition[];
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  className?: string;
}

// ── Add Filter Popover ────────────────────────────────────

function AddFilterPopover({
  fields,
  onAdd,
}: {
  fields: FieldDefinition[];
  onAdd: (filter: FilterCondition) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"field" | "operator" | "value">("field");
  const [selectedField, setSelectedField] = useState<FieldDefinition | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<FilterOperator | null>(null);
  const [value, setValue] = useState("");

  function reset() {
    setStep("field");
    setSelectedField(null);
    setSelectedOperator(null);
    setValue("");
  }

  function handleFieldSelect(field: FieldDefinition) {
    setSelectedField(field);
    setStep("operator");
  }

  function handleOperatorSelect(op: FilterOperator) {
    setSelectedOperator(op);
    if (op === "is_null" || op === "is_not_null") {
      onAdd({ field: selectedField!.id, operator: op, value: null });
      reset();
      setOpen(false);
      return;
    }
    setStep("value");
  }

  function handleValueSubmit() {
    if (!selectedField || !selectedOperator) return;

    let parsedValue: FilterCondition["value"] = value;
    if (selectedField.type === "number") {
      parsedValue = Number(value);
      if (isNaN(parsedValue as number)) return;
    }
    if (selectedOperator === "in") {
      parsedValue = value.split(",").map((v) => v.trim()).filter(Boolean);
    }

    onAdd({
      field: selectedField.id,
      operator: selectedOperator,
      value: parsedValue,
    });
    reset();
    setOpen(false);
  }

  const operators = selectedField
    ? OPERATORS_BY_TYPE[selectedField.type] ?? OPERATORS_BY_TYPE.text
    : [];

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" />
          Add Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        {step === "field" && (
          <div className="max-h-64 overflow-y-auto py-1">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
              Select field
            </div>
            {fields.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => handleFieldSelect(field)}
                className="flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                {field.label}
              </button>
            ))}
          </div>
        )}

        {step === "operator" && (
          <div className="max-h-64 overflow-y-auto py-1">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
              {selectedField?.label} &mdash; select condition
            </div>
            {operators.map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => handleOperatorSelect(op)}
                className="flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                {OPERATOR_LABELS[op]}
              </button>
            ))}
          </div>
        )}

        {step === "value" && (
          <div className="space-y-3 p-3">
            <div className="text-xs font-medium text-muted-foreground">
              {selectedField?.label} {selectedOperator ? OPERATOR_LABELS[selectedOperator] : ""}
            </div>
            {selectedField?.type === "enum" && selectedField.options ? (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {selectedField.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onAdd({
                        field: selectedField.id,
                        operator: selectedOperator!,
                        value: selectedOperator === "in"
                          ? [opt.value]
                          : opt.value,
                      });
                      reset();
                      setOpen(false);
                    }}
                    className="flex w-full items-center rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleValueSubmit();
                }}
              >
                <Input
                  autoFocus
                  type={selectedField?.type === "number" ? "number" : selectedField?.type === "date" ? "date" : "text"}
                  placeholder={selectedOperator === "in" ? "value1, value2, ..." : "Enter value..."}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="mt-2 w-full"
                  disabled={!value.trim()}
                >
                  Apply
                </Button>
              </form>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Filter Chip ───────────────────────────────────────────

function FilterChip({
  filter,
  fields,
  onRemove,
}: {
  filter: FilterCondition;
  fields: FieldDefinition[];
  onRemove: () => void;
}) {
  const field = fields.find((f) => f.id === filter.field);
  const label = field?.label ?? filter.field;

  let displayValue = "";
  if (filter.operator === "is_null") {
    displayValue = "is empty";
  } else if (filter.operator === "is_not_null") {
    displayValue = "is not empty";
  } else {
    const opLabel = OPERATOR_LABELS[filter.operator];
    const val = Array.isArray(filter.value)
      ? filter.value.join(", ")
      : String(filter.value ?? "");
    displayValue = `${opLabel} ${val}`;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-foreground">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">{displayValue}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

// ── Main SmartFilterBar ───────────────────────────────────

export function SmartFilterBar({
  entityType,
  fields,
  filters,
  onFiltersChange,
  className,
}: SmartFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeView, hasUnsavedChanges, loadView, clearActiveView, revertToActiveView, setFilters } = useActiveView(filters);
  const [builderOpen, setBuilderOpen] = useState(false);

  // Sync filters from URL on mount
  useEffect(() => {
    const urlFilters = filtersFromSearchParams(searchParams.get("filters"));
    if (urlFilters.length > 0 && filters.length === 0) {
      onFiltersChange(urlFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (filters.length > 0) {
      params.set("filters", filtersToSearchParams(filters));
    } else {
      params.delete("filters");
    }
    const newUrl = `${pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Keep useActiveView in sync with external filter changes
  useEffect(() => {
    setFilters(filters);
  }, [filters, setFilters]);

  function addFilter(filter: FilterCondition) {
    onFiltersChange([...filters, filter]);
  }

  function removeFilter(index: number) {
    onFiltersChange(filters.filter((_, i) => i !== index));
    if (filters.length <= 1) {
      clearActiveView();
    }
  }

  function clearAll() {
    onFiltersChange([]);
    clearActiveView();
  }

  function handleLoadView(view: SavedView) {
    loadView(view);
    onFiltersChange(view.filters);
  }

  function handleRevert() {
    revertToActiveView();
    if (activeView) {
      onFiltersChange(activeView.filters);
    }
  }

  async function handleSaveAsView(name: string, viewFilters: FilterCondition[]) {
    const res = await fetch("/api/saved-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        entity_type: entityType,
        filters: viewFilters,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        loadView(json.data);
        onFiltersChange(json.data.filters);
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <AddFilterPopover fields={fields} onAdd={addFilter} />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setBuilderOpen(true)}
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filter Builder</span>
        </Button>

        {filters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}

        {hasUnsavedChanges && (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs text-amber-500">
              <AlertCircle className="size-3" />
              <span className="hidden sm:inline">Unsaved changes</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevert}
              className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Revert to saved view"
            >
              <RotateCcw className="size-3" />
            </Button>
          </div>
        )}

        <div className="ml-auto">
          <SavedViewsDropdown
            entityType={entityType}
            currentFilters={filters}
            activeView={activeView}
            hasUnsavedChanges={hasUnsavedChanges}
            onLoadView={handleLoadView}
          />
        </div>
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((filter, index) => (
            <FilterChip
              key={`${filter.field}-${filter.operator}-${index}`}
              filter={filter}
              fields={fields}
              onRemove={() => removeFilter(index)}
            />
          ))}
        </div>
      )}

      <FilterBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        fields={fields}
        entityType={entityType}
        initialFilters={filters}
        onApply={onFiltersChange}
        onSaveAsView={handleSaveAsView}
      />
    </div>
  );
}

export type { SmartFilterBarProps, FieldDefinition as FilterFieldDefinition };
