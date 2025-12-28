"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Download,
  Filter,
  RefreshCw,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditLog {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  search?: string;
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  const actions = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
    "STOCK_USAGE",
    "STOCK_ADDITION",
    "STOCK_ADJUSTMENT",
    "SALES_TRANSACTION",
    "COST_OPERATION",
    "BACKUP_CREATED",
    "DATA_EXPORT",
    "PERMISSION_CHANGE",
  ];

  const resources = [
    "USER",
    "PRODUCT",
    "PRODUCT_GROUP",
    "STOCK_TRANSACTION",
    "SALES_TRANSACTION",
    "COST_OPERATION",
    "NOTIFICATION",
    "SYSTEM",
  ];

  useEffect(() => {
    fetchAuditLogs();
  }, [pagination.page, filters]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/audit/logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.logs);
        setPagination((prev) => ({
          ...prev,
          total: data.data.pagination.total,
          pages: data.data.pagination.pages,
        }));
      } else {
        console.error("Failed to fetch audit logs:", data.error);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });
      params.append("limit", "10000"); // Export more records

      const response = await fetch(`/api/audit/logs?${params}`);
      const data = await response.json();

      if (data.success) {
        const csv = convertToCSV(data.data.logs);
        downloadCSV(csv, `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`);
      }
    } catch (error) {
      console.error("Error exporting logs:", error);
    }
  };

  const convertToCSV = (logs: AuditLog[]): string => {
    const headers = [
      "Timestamp",
      "User",
      "Action",
      "Resource",
      "Resource ID",
      "Success",
      "IP Address",
      "Details",
      "Error Message",
    ];

    const rows = logs.map((log) => [
      format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
      log.userId?.name || log.userEmail,
      log.action,
      log.resource,
      log.resourceId || "",
      log.success ? "Yes" : "No",
      log.ipAddress || "",
      JSON.stringify(log.details),
      log.errorMessage || "",
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-800";
      case "UPDATE":
        return "bg-blue-100 text-blue-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      case "LOGIN":
      case "LOGOUT":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Logs</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAuditLogs}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
                />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Input
                placeholder="Search by user email..."
                value={filters.search || ""}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>

            <Select
              value={filters.action || "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "action",
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.resource || "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "resource",
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {resources.map((resource) => (
                  <SelectItem key={resource} value={resource}>
                    {resource}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.success?.toString() || "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "success",
                  value === "all" ? undefined : value === "true"
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Success</SelectItem>
                <SelectItem value="false">Failed</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Start Date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => handleFilterChange("startDate", date)}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    End Date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => handleFilterChange("endDate", date)}
                  />
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">
                    Timestamp
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-left">
                    User
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-left">
                    Action
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-left">
                    Resource
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-left">
                    Status
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-left">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2 text-sm">
                      {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-sm">
                      <div>
                        <div className="font-medium">
                          {log.userId?.name || "Unknown"}
                        </div>
                        <div className="text-gray-500">{log.userEmail}</div>
                      </div>
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      <Badge className={getActionBadgeColor(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-sm">
                      <div>
                        <div className="font-medium">{log.resource}</div>
                        {log.resourceId && (
                          <div className="text-gray-500 text-xs">
                            {log.resourceId}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      <Badge
                        className={
                          log.success
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {log.success ? "Success" : "Failed"}
                      </Badge>
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-sm">
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                        {log.errorMessage && (
                          <div className="mt-2 text-red-600 text-xs">
                            Error: {log.errorMessage}
                          </div>
                        )}
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
