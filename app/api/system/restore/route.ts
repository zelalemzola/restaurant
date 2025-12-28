// API route for system restore operations
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { restoreBackup } from "@/lib/utils/backup";
import { hasPermission } from "@/lib/utils/rbac";

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
    if (!hasPermission(session.user, "system.restore")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions for restore operations",
          },
        },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const backupFile = formData.get("backup") as File;
    const validateChecksum = formData.get("validateChecksum") === "true";
    const overwriteExisting = formData.get("overwriteExisting") === "true";
    const collectionsStr = formData.get("collections") as string;

    if (!backupFile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Backup file is required",
          },
        },
        { status: 400 }
      );
    }

    // Parse collections filter
    let collections: string[] | undefined;
    if (collectionsStr) {
      try {
        collections = JSON.parse(collectionsStr);
      } catch {
        collections = collectionsStr.split(",").map((c) => c.trim());
      }
    }

    // Convert file to buffer
    const backupData = Buffer.from(await backupFile.arrayBuffer());

    // Restore backup
    const result = await restoreBackup(
      session.user.id,
      session.user.email,
      backupData,
      {
        validateChecksum,
        overwriteExisting,
        collections,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RESTORE_FAILED",
            message: result.error || "Backup restore failed",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        restoredCollections: result.restoredCollections,
        totalDocuments: result.totalDocuments,
        message: `Successfully restored ${result.totalDocuments} documents across ${result.restoredCollections.length} collections`,
      },
    });
  } catch (error) {
    console.error("Error restoring backup:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to restore backup",
        },
      },
      { status: 500 }
    );
  }
}
