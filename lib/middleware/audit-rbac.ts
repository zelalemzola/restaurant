// Middleware for audit logging and RBAC
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/utils/rbac";
import {
  createAuditLog,
  extractClientInfo,
  AuditAction,
  AuditResource,
} from "@/lib/utils/audit";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuditContext {
  user: AuthenticatedUser;
  request: NextRequest;
}

/**
 * Middleware to authenticate user and check permissions
 */
export async function withAuthAndPermissions(
  request: NextRequest,
  requiredPermissions: Permission[]
): Promise<{ user: AuthenticatedUser; error?: NextResponse }> {
  try {
    // Get user session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return {
        user: null as any,
        error: NextResponse.json(
          {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Authentication required" },
          },
          { status: 401 }
        ),
      };
    }

    // Check permissions
    const hasRequiredPermissions = requiredPermissions.every((permission) =>
      hasPermission(session.user, permission)
    );

    if (!hasRequiredPermissions) {
      // Log unauthorized access attempt
      await createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email,
        action: "PERMISSION_CHANGE",
        resource: "SYSTEM",
        details: {
          attemptedPermissions: requiredPermissions,
          userRole: session.user.role,
          denied: true,
        },
        success: false,
        errorMessage: "Insufficient permissions",
        ...extractClientInfo(request),
      });

      return {
        user: null as any,
        error: NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Insufficient permissions",
            },
          },
          { status: 403 }
        ),
      };
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role || "user",
      },
    };
  } catch (error) {
    console.error("Authentication/authorization error:", error);
    return {
      user: null as any,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Authentication failed",
          },
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Audit a successful operation
 */
export async function auditSuccess(
  context: AuditContext,
  action: AuditAction,
  resource: AuditResource,
  resourceId: string | undefined,
  details: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId: context.user.id,
    userEmail: context.user.email,
    action,
    resource,
    resourceId,
    details,
    success: true,
    ...extractClientInfo(context.request),
  });
}

/**
 * Audit a failed operation
 */
export async function auditFailure(
  context: AuditContext,
  action: AuditAction,
  resource: AuditResource,
  resourceId: string | undefined,
  details: Record<string, any>,
  errorMessage: string
): Promise<void> {
  await createAuditLog({
    userId: context.user.id,
    userEmail: context.user.email,
    action,
    resource,
    resourceId,
    details,
    success: false,
    errorMessage,
    ...extractClientInfo(context.request),
  });
}

/**
 * Higher-order function to wrap API routes with auth, RBAC, and audit logging
 */
export function withAuditAndRBAC<T = any>(
  requiredPermissions: Permission[],
  action: AuditAction,
  resource: AuditResource,
  handler: (
    request: NextRequest,
    context: AuditContext
  ) => Promise<{ data?: T; resourceId?: string; details?: Record<string, any> }>
) {
  return async (request: NextRequest) => {
    const { user, error } = await withAuthAndPermissions(
      request,
      requiredPermissions
    );

    if (error) {
      return error;
    }

    const context: AuditContext = { user, request };

    try {
      const result = await handler(request, context);

      // Audit successful operation
      await auditSuccess(
        context,
        action,
        resource,
        result.resourceId,
        result.details || {}
      );

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Audit failed operation
      await auditFailure(
        context,
        action,
        resource,
        undefined,
        { error: errorMessage },
        errorMessage
      );

      console.error(`${action} ${resource} error:`, error);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "OPERATION_FAILED",
            message: errorMessage,
          },
        },
        { status: 500 }
      );
    }
  };
}
