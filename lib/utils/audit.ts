// Audit logging utilities
import { AuditLog, IAuditLog } from "@/lib/models/AuditLog";
import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "STOCK_USAGE"
  | "STOCK_ADDITION"
  | "STOCK_ADJUSTMENT"
  | "SALES_TRANSACTION"
  | "COST_OPERATION"
  | "BACKUP_CREATED"
  | "DATA_EXPORT"
  | "PERMISSION_CHANGE";

export type AuditResource =
  | "USER"
  | "PRODUCT"
  | "PRODUCT_GROUP"
  | "STOCK_TRANSACTION"
  | "SALES_TRANSACTION"
  | "COST_OPERATION"
  | "NOTIFICATION"
  | "SYSTEM";

export interface AuditLogData {
  userId: string;
  userEmail: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await connectDB();

    const auditEntry = new AuditLog({
      userId: data.userId,
      userEmail: data.userEmail,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: new Date(),
      success: data.success ?? true,
      errorMessage: data.errorMessage,
    });

    await auditEntry.save();
  } catch (error) {
    // Log audit failures to console but don't throw to avoid breaking main operations
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Extract client information from NextRequest
 */
export function extractClientInfo(request: NextRequest) {
  const ipAddress =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}

/**
 * Create audit log for stock transactions
 */
export async function auditStockTransaction(
  userId: string,
  userEmail: string,
  action: "STOCK_USAGE" | "STOCK_ADDITION" | "STOCK_ADJUSTMENT",
  productId: string,
  details: {
    productName: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason?: string;
  },
  request?: NextRequest
) {
  const clientInfo = request ? extractClientInfo(request) : {};

  await createAuditLog({
    userId,
    userEmail,
    action,
    resource: "STOCK_TRANSACTION",
    resourceId: productId,
    details: {
      ...details,
      transactionType: action.toLowerCase().replace("stock_", ""),
    },
    ...clientInfo,
  });
}

/**
 * Create audit log for sales transactions
 */
export async function auditSalesTransaction(
  userId: string,
  userEmail: string,
  transactionId: string,
  details: {
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    totalAmount: number;
    paymentMethod: string;
  },
  request?: NextRequest
) {
  const clientInfo = request ? extractClientInfo(request) : {};

  await createAuditLog({
    userId,
    userEmail,
    action: "SALES_TRANSACTION",
    resource: "SALES_TRANSACTION",
    resourceId: transactionId,
    details,
    ...clientInfo,
  });
}

/**
 * Create audit log for CRUD operations
 */
export async function auditCRUDOperation(
  userId: string,
  userEmail: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  resource: AuditResource,
  resourceId: string,
  details: Record<string, any>,
  request?: NextRequest
) {
  const clientInfo = request ? extractClientInfo(request) : {};

  await createAuditLog({
    userId,
    userEmail,
    action,
    resource,
    resourceId,
    details,
    ...clientInfo,
  });
}

/**
 * Create audit log for authentication events
 */
export async function auditAuthEvent(
  userId: string,
  userEmail: string,
  action: "LOGIN" | "LOGOUT",
  success: boolean = true,
  errorMessage?: string,
  request?: NextRequest
) {
  const clientInfo = request ? extractClientInfo(request) : {};

  await createAuditLog({
    userId,
    userEmail,
    action,
    resource: "USER",
    resourceId: userId,
    details: {
      authEvent: action.toLowerCase(),
    },
    success,
    errorMessage,
    ...clientInfo,
  });
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(filters: {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  page?: number;
  limit?: number;
}) {
  await connectDB();

  const {
    userId,
    action,
    resource,
    resourceId,
    startDate,
    endDate,
    success,
    page = 1,
    limit = 50,
  } = filters;

  // Build query
  const query: any = {};

  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (resource) query.resource = resource;
  if (resourceId) query.resourceId = resourceId;
  if (success !== undefined) query.success = success;

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate("userId", "name email")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
