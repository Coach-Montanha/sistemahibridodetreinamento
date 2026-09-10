import * as React from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface DataGridColumn<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterKey?: string;
  className?: string;
}

export interface DataGridFacetedFilter {
  id: string;
  title: string;
  options: { label: string; value: string }[];
}

interface DataGridProps<T> {
  data: T[];
  columns: DataGridColumn<T>[];
  keyExtractor: (row: T) => string;
  searchPlaceholder?: string;
  searchableKeys?: (keyof T)[];
  facetedFilters?: DataGridFacetedFilter[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onRowClick?: (row: T) => void;
  initialPageSize?: number;
  bulkActions?: React.ReactNode;
  className?: string;
}

export function DataGrid<T>({
  data = [],
  columns = [],
  keyExtractor,
  searchPlaceholder = "Buscar registros...",
  searchableKeys,
  facetedFilters = [],
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  onRowClick,
  initialPageSize = 10,
  bulkActions,
  className,
}: DataGridProps<T>) {
  const [search, setSearch] = React.useState("");
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [activeFacetedFilters, setActiveFacetedFilters] = React.useState<Record<string, string[]>>({});
  const [visibleColumns, setVisibleColumns] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    columns.forEach((c) => {
      init[c.id] = true;
    });
    return init;
  });

  // Filter Data
  const filteredData = React.useMemo(() => {
    return data.filter((row: any) => {
      // 1. Search Query
      if (search.trim()) {
        const query = search.toLowerCase();
        let matches = false;
        if (searchableKeys && searchableKeys.length > 0) {
          matches = searchableKeys.some((k) => {
            const val = row[k];
            return val != null && String(val).toLowerCase().includes(query);
          });
        } else {
          matches = Object.values(row).some((val) => {
            return val != null && String(val).toLowerCase().includes(query);
          });
        }
        if (!matches) return false;
      }

      // 2. Faceted Filters
      for (const [filterId, selectedVals] of Object.entries(activeFacetedFilters)) {
        if (!selectedVals || selectedVals.length === 0) continue;
        const rowVal = row[filterId];
        if (Array.isArray(rowVal)) {
          const hasAny = selectedVals.some((v) => rowVal.includes(v));
          if (!hasAny) return false;
        } else if (rowVal == null || !selectedVals.includes(String(rowVal))) {
          return false;
        }
      }

      return true;
    });
  }, [data, search, searchableKeys, activeFacetedFilters]);

  // Sort Data
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return filteredData;
    const col = columns.find((c) => c.id === sortColumn);
    if (!col || !col.accessorKey) return filteredData;

    return [...filteredData].sort((a: any, b: any) => {
      const aVal = a[col.accessorKey!];
      const bVal = b[col.accessorKey!];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === "asc" ? -1 : 1;
      if (bVal == null) return sortDirection === "asc" ? 1 : -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortColumn, sortDirection, columns]);

  // Paginate Data
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = React.useMemo(() => {
    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  // Selection Handlers
  const allCurrentPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row) => selectedIds.has(keyExtractor(row)));

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedIds);
    if (allCurrentPageSelected) {
      paginatedData.forEach((row) => newSelected.delete(keyExtractor(row)));
    } else {
      paginatedData.forEach((row) => newSelected.add(keyExtractor(row)));
    }
    onSelectionChange(newSelected);
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    onSelectionChange(newSelected);
  };

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(colId);
      setSortDirection("asc");
    }
  };

  const toggleFacetedOption = (filterId: string, value: string) => {
    setActiveFacetedFilters((prev) => {
      const current = prev[filterId] || [];
      const exists = current.includes(value);
      const updated = exists ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [filterId]: updated };
    });
    setPage(0);
  };

  const clearFacetedFilter = (filterId: string) => {
    setActiveFacetedFilters((prev) => {
      const copy = { ...prev };
      delete copy[filterId];
      return copy;
    });
    setPage(0);
  };

  return (
    <div className={cn("w-full space-y-4 font-sans", className)}>
      {/* Top Toolbar: Search, Filters, Column Visibility, Bulk Actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="pl-9 h-9 text-xs sm:text-sm bg-card"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Faceted Filters Dropdowns */}
          {facetedFilters.map((filter) => {
            const selectedVals = activeFacetedFilters[filter.id] || [];
            return (
              <DropdownMenu key={filter.id}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 text-xs border-dashed cursor-pointer font-medium",
                      selectedVals.length > 0 && "border-solid border-primary/60 bg-primary/5 text-primary"
                    )}
                  >
                    <span>{filter.title}</span>
                    {selectedVals.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1.5 px-1.5 py-0 text-[10px] font-mono rounded bg-primary/20 text-primary border-none"
                      >
                        {selectedVals.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel className="text-xs">{filter.title}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {filter.options.map((opt) => {
                    const isChecked = selectedVals.includes(opt.value);
                    return (
                      <DropdownMenuCheckboxItem
                        key={opt.value}
                        checked={isChecked}
                        onCheckedChange={() => toggleFacetedOption(filter.id, opt.value)}
                        className="text-xs cursor-pointer"
                      >
                        {opt.label}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                  {selectedVals.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <button
                        onClick={() => clearFacetedFilter(filter.id)}
                        className="w-full text-center py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                      >
                        Limpar filtro
                      </button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>

        {/* Right Actions: Column Toggle & Bulk Actions */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {selectable && selectedIds.size > 0 && bulkActions}

          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs cursor-pointer gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Colunas</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel className="text-xs">Exibir colunas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleColumns[col.id] !== false}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({ ...prev, [col.id]: checked }))
                  }
                  className="text-xs cursor-pointer"
                >
                  {col.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 font-semibold text-muted-foreground">
                {selectable && (
                  <th className="w-10 px-3 py-3 text-center">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos da página"
                    />
                  </th>
                )}
                {columns
                  .filter((col) => visibleColumns[col.id] !== false)
                  .map((col) => {
                    const isSorted = sortColumn === col.id;
                    return (
                      <th
                        key={col.id}
                        onClick={() => col.sortable && handleSort(col.id)}
                        className={cn(
                          "px-4 py-3 select-none text-xs font-bold uppercase tracking-wider",
                          col.sortable && "cursor-pointer hover:text-foreground",
                          col.className
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col.header}</span>
                          {col.sortable && (
                            <span className="text-muted-foreground/60">
                              {isSorted ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="py-12 text-center text-xs sm:text-sm text-muted-foreground"
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const id = keyExtractor(row);
                  const isSelected = selectedIds.has(id);
                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={cn(
                        "transition-colors",
                        onRowClick && "cursor-pointer hover:bg-muted/40",
                        isSelected && "bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      {selectable && (
                        <td
                          className="w-10 px-3 py-2.5 text-center"
                          onClick={(e) => toggleSelectRow(id, e)}
                        >
                          <Checkbox checked={isSelected} aria-label={`Selecionar item ${id}`} />
                        </td>
                      )}
                      {columns
                        .filter((col) => visibleColumns[col.id] !== false)
                        .map((col) => (
                          <td key={col.id} className={cn("px-4 py-2.5 text-foreground", col.className)}>
                            {col.cell
                              ? col.cell(row)
                              : col.accessorKey
                              ? String((row as any)[col.accessorKey] ?? "—")
                              : null}
                          </td>
                        ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Linhas por página:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs bg-card">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="font-mono ml-2">
              {sortedData.length === 0
                ? "0 itens"
                : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sortedData.length)} de ${sortedData.length}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono">
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-7 w-7 cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-7 w-7 cursor-pointer"
                title="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
