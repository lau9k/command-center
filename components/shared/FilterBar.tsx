"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Plus,
  X,
  Save,
  ChevronDown,
  Loader2,
  Trash2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FilterCondition, FilterOperator } from "@/lib/filters";
import {
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  filtersToSearchParams,
  filtersFromSearchParams,
} from "@/lib/filters";
import type { SavedView } from "@/lib/filters";

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

// ── Saved View Dropdown ───────────────────────────────────

function SavedViewDropdown({
  entityType,
  currentFilters,
  onLoadView,
}: {
  entityType: string;
  currentFilters: FilterCondition[];
  onLoadView: (view: SavedView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const hasFetched = useRef(false);

  const fetchViews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/saved-views?entity_type=${encodeURIComponent(entityType)}`);
      if (res.ok) {
        const json = await res.json();
        setViews(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => {
    if (open && !hasFetched.current) {
      hasFetched.current = true;
      fetchViews();
    }
  }, [open, fetchViews]);

  async function handleSave() {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          entity_type: entityType,
          filters: currentFilters,
        }),
      });
      if (res.ok) {
        setSaveName("");
        setShowSave(false);
        hasFetched.current = false;
        await fetchViews();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/saved-views/${id}`, { method: "DELETE" });
    setViews((v) => v.filter((view) => view.id !== id));
  }

  async function handleSetDefault(view: SavedView) {
    const res = await fetch(`/api/saved-views/${view.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: !view.is_default }),
    });
    if (res.ok) {
      hasFetched.current = false;
      await fetchViews();
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <ChevronDown className="size-4" />
          Views
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          Saved Views
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : views.length === 0 && !showSave ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No saved views yet
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto py-1">
            {views.map((view) => (
              <div
                key={view.id}
                className="group flex items-center gap-1 px-3 py-2 transition-colors hover:bg-accent"
              >
                <button
                  type="button"
                  onClick={() => {
                    onLoadView(view);
                    setOpen(false);
                  }}
                  className="flex-1 text-left text-sm"
                >
                  {view.name}
                  {view.is_default && (
                    <Star className="ml-1 inline size-3 fill-current text-yellow-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDefault(view)}
                  className="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                  title={view.is_default ? "Remove default" : "Set as default"}
                >
                  <Star className={cn("size-3", view.is_default ? "fill-current text-yellow-500" : "text-muted-foreground")} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(view.id)}
                  className="rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                >
                  <Trash2 className="size-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t p-2">
          {showSave ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="flex items-center gap-2"
            >
              <Input
                autoFocus
                placeholder="View name..."
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" disabled={saving || !saveName.trim()}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              </Button>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => setShowSave(true)}
              disabled={currentFilters.length === 0}
            >
              <Save className="size-3" />
              Save current filters as view
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
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

  function addFilter(filter: FilterCondition) {
    onFiltersChange([...filters, filter]);
  }

  function removeFilter(index: number) {
    onFiltersChange(filters.filter((_, i) => i !== index));
  }

  function clearAll() {
    onFiltersChange([]);
  }

  function loadView(view: SavedView) {
    onFiltersChange(view.filters);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <AddFilterPopover fields={fields} onAdd={addFilter} />

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

        <div className="ml-auto">
          <SavedViewDropdown
            entityType={entityType}
            currentFilters={filters}
            onLoadView={loadView}
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
    </div>
  );
}

export type { SmartFilterBarProps, FieldDefinition as FilterFieldDefinition };
