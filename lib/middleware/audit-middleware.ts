// Middleware for automatic audit logging
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createAuditLog,
  extractClientInfo,
  AuditAction,
  AuditResource,
} from "@/lib/utils/audit";

// Map HTTP methods to audit actions
const METHOD_TO_ACTION: Record<string, AuditAction> = {
  POST: "CREATE",
  PUT: "UPDATE",
  PATCH: "UPDATE",
  DELETE: "DELETE",
  GET: "CREATE", // For operations like exports, backups
};

// Map API routes to resources
const ROUTE_TO_RESOURCE: Record<string, AuditResource> = {
  "/api/products": "PRODUCT",
  "/api/product-groups": "PRODUCT_GROUP",
  "/api/inventory": "STOCK_TRANSACTION",
  "/api/sales": "SALES_TRANSACTION",
  "/api/costs": "COST_OPERATION",
  "/api/notifications": "NOTIFICATION",
  "/api/users": "USER",
  "/api/system": "SYSTEM",
  "/api/audit": "SYSTEM",
};

export interface AuditMiddlewareOptions {
  skipRoutes?: string[];
  skipMethods?: string[];
  logSuccessOnly?: boolean;
}

/**
 * Create audit middleware for API routes
 */
export function createAuditMiddleware(options: AuditMiddlewareOptions = {}) {
  const {
    skipRoutes = ["/api/auth", "/api/health"],
    skipMethods = ["GET"],
    logSuccessOnly = false,
  } = options;

  return async function auditMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const { pathname } = new URL(request.url);
    const method = request.method;

    // Skip if route or method should be ignored
    if (
      skipRoutes.some((route) => pathname.startsWith(route)) ||
      skipMethods.includes(method)
    ) {
      return handler(request);
    }

    // Get user session
    let session;
    try {
      session = await auth.api.getSession({
        headers: request.headers,
      });
    } catch (error) {
      // Continue without session if auth fails
      session = null;
    }

    // Execute the handler
    let response: NextResponse;
    let error: Error | null = null;

    try {
      response = await handler(request);
    } catch (err) {
      error = err instanceof Error ? err : new Error("Unknown error");
      response = NextResponse.json(
        {
          success: false,
          error: { code: "INTERNAL_ERROR", message: error.message },
        },
        { status: 500 }
      );
    }

    // Only log if we have a user session
    if (session?.user) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const success = response.status < 400 && !error;

      // Skip logging if only logging successes and this failed
      if (logSuccessOnly && !success) {
        return response;
      }

      // Determine audit action and resource
      const action = METHOD_TO_ACTION[method] || "CREATE";
      const resource = getResourceFromPath(pathname);

      if (resource) {
        // Extract request details
        const clientInfo = extractClientInfo(request);
        let requestBody: any = {};

        try {
          if (
            method !== "GET" &&
            request.headers.get("content-type")?.includes("application/json")
          ) {
            // Clone request to read body without consuming it
            const clonedRequest = request.clone();
            requestBody = await clonedRequest.json();
          }
        } catch {
          // Ignore body parsing errors
        }

        // Create audit log entry
        await createAuditLog({
          userId: session.user.id,
          userEmail: session.user.email,
          action,
          resource,
          resourceId: extractResourceId(pathname, requestBody),
          details: {
            method,
            path: pathname,
            statusCode: response.status,
            duration,
            requestBody: sanitizeRequestBody(requestBody),
            userAgent: clientInfo.userAgent,
            timestamp: new Date(startTime),
          },
          ipAddress: clientInfo.ipAddress,
          success,
          errorMessage: error?.message,
        });
      }
    }

    return response;
  };
}

/**
 * Get resource type from API path
 */
function getResourceFromPath(pathname: string): AuditResource | null {
  for (const [route, resource] of Object.entries(ROUTE_TO_RESOURCE)) {
    if (pathname.startsWith(route)) {
      return resource;
    }
  }
  return null;
}

/**
 * Extract resource ID from path or request body
 */
function extractResourceId(
  pathname: string,
  requestBody: any
): string | undefined {
  // Try to extract ID from path (e.g., /api/products/123)
  const pathParts = pathname.split("/");
  const lastPart = pathParts[pathParts.length - 1];

  // Check if last part looks like an ID (ObjectId or UUID)
  if (lastPart && (lastPart.length === 24 || lastPart.includes("-"))) {
    return lastPart;
  }

  // Try to extract from request body
  if (requestBody) {
    return (
      requestBody.id ||
      requestBody._id ||
      requestBody.productId ||
      requestBody.userId
    );
  }

  return undefined;
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== "object") {
    return body;
  }

  const sensitiveFields = ["password", "token", "secret", "key", "auth"];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Wrapper function to apply audit middleware to API routes
 */
export function withAuditLogging(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: AuditMiddlewareOptions
) {
  const middleware = createAuditMiddleware(options);
  return (request: NextRequest) => middleware(request, handler);
}
