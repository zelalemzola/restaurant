// API route for system backup operations
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBackup, getBackupStats } from "@/lib/utils/backup";
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
    if (!hasPermission(session.user, "system.backup")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions for backup operations",
          },
        },
        { status: 403 }
      );
    }

    // Get backup statistics
    const stats = await getBackupStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting backup stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get backup statistics",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    if (!hasPermission(session.user, "system.backup")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions for backup operations",
          },
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { collections, compress = true, includeIndexes = false } = body;

    // Create backup
    const result = await createBackup(session.user.id, session.user.email, {
      collections,
      compress,
      includeIndexes,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BACKUP_FAILED",
            message: result.error || "Backup creation failed",
          },
        },
        { status: 500 }
      );
    }

    // Return backup data as downloadable file
    const headers = new Headers();
    headers.set("Content-Type", "application/octet-stream");
    headers.set(
      "Content-Disposition",
      `attachment; filename="backup_${result.backupId}.${
        compress ? "gz" : "json"
      }"`
    );
    headers.set("Content-Length", result.data!.length.toString());

    return new NextResponse(result.data as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create backup",
        },
      },
      { status: 500 }
    );
  }
}
