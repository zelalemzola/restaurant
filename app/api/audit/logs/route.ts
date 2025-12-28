// API route for audit logs
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditLogs } from "@/lib/utils/audit";
import { hasPermission } from "@/lib/utils/rbac";

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }

    // Check permissions
    if (!hasPermission(session.user, "audit.read")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions to access audit logs",
          },
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const action = (searchParams.get("action") as any) || undefined;
    const resource = (searchParams.get("resource") as any) || undefined;
    const resourceId = searchParams.get("resourceId") || undefined;
    const success = searchParams.get("success")
      ? searchParams.get("success") === "true"
      : undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Max 100 per page

    // Parse date filters
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Get audit logs
    const result = await getAuditLogs({
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      success,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch audit logs",
        },
      },
      { status: 500 }
    );
  }
}
