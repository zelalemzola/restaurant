"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingTable } from "@/components/ui/loading";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ChevronDown, ChevronUp, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T, value: any) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  className?: string;
  mobileLabel?: string; // Label to show in mobile card view
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  error?: Error | null;
  title?: string;
  description?: string;
  searchable?: boolean;
  sortable?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  mobileBreakpoint?: "sm" | "md" | "lg";
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  error = null,
  title,
  description,
  searchable = false,
  sortable = false,
  pagination,
  onRowClick,
  emptyMessage = "No data available",
  className,
  mobileBreakpoint = "md",
}: ResponsiveTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Filter data based on search term
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;

    return data.filter((item) =>
      columns.some((column) => {
        if (!column.searchable) return false;
        const value = item[column.key as keyof T];
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Handle sort
  const handleSort = (key: string) => {
    if (!sortable) return;

    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  // Get responsive classes
  const getResponsiveClasses = () => {
    const breakpoints = {
      sm: "sm:table",
      md: "md:table",
      lg: "lg:table",
    };
    return `hidden ${breakpoints[mobileBreakpoint]}`;
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-red-800">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {(title || description || searchable) && (
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            {searchable && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6">
            <LoadingTable rows={5} />
          </div>
        ) : sortedData.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={getResponsiveClasses()}>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {columns.map((column) => (
                      <th
                        key={String(column.key)}
                        className={cn(
                          "px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                          column.sortable &&
                            sortable &&
                            "cursor-pointer hover:text-foreground",
                          column.className
                        )}
                        onClick={() =>
                          column.sortable && handleSort(String(column.key))
                        }
                      >
                        <div className="flex items-center space-x-1">
                          <span>{column.header}</span>
                          {column.sortable && sortable && (
                            <div className="flex flex-col">
                              <ChevronUp
                                className={cn(
                                  "h-3 w-3",
                                  sortConfig?.key === column.key &&
                                    sortConfig.direction === "asc"
                                    ? "text-foreground"
                                    : "text-muted-foreground/50"
                                )}
                              />
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3 -mt-1",
                                  sortConfig?.key === column.key &&
                                    sortConfig.direction === "desc"
                                    ? "text-foreground"
                                    : "text-muted-foreground/50"
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedData.map((item, index) => (
                    <tr
                      key={index}
                      className={cn(
                        "hover:bg-muted/50 transition-colors",
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={() => onRowClick?.(item)}
                    >
                      {columns.map((column) => {
                        const value = item[column.key as keyof T];
                        return (
                          <td
                            key={String(column.key)}
                            className={cn(
                              "px-6 py-4 whitespace-nowrap text-sm",
                              column.className
                            )}
                          >
                            {column.render
                              ? column.render(item, value)
                              : String(value || "")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div
              className={cn(
                "block",
                getResponsiveClasses()
                  .replace("hidden", "")
                  .replace("table", "hidden")
              )}
            >
              <div className="divide-y divide-border">
                {sortedData.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    <div className="space-y-2">
                      {columns.map((column) => {
                        const value = item[column.key as keyof T];
                        if (!value && value !== 0) return null;

                        return (
                          <div
                            key={String(column.key)}
                            className="flex justify-between items-start"
                          >
                            <span className="text-sm font-medium text-muted-foreground">
                              {column.mobileLabel || column.header}:
                            </span>
                            <span className="text-sm text-right flex-1 ml-2">
                              {column.render
                                ? column.render(item, value)
                                : String(value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination && sortedData.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total
              )}{" "}
              of {pagination.total} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={
                  pagination.page * pagination.pageSize >= pagination.total
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
