// Individual user management API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { withAuthAndPermissions } from "@/lib/middleware/audit-rbac";
import bcrypt from "bcryptjs";
import { z } from "zod";
import mongoose from "mongoose";

export const runtime = "nodejs";

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "manager", "user"]).optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
});

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Unified user lookup function that handles both Better Auth 'id' and MongoDB '_id' formats
async function findUserByAnyId(
  db: any,
  id: string
): Promise<{
  user: any | null;
  queryField: { id?: string | mongoose.Types.ObjectId; _id?: string | mongoose.Types.ObjectId } | null;
}> {
  console.log(`[findUserByAnyId] Looking up user with ID: ${id}, isValidObjectId: ${mongoose.Types.ObjectId.isValid(id)}`);

  let user: any = null;
  let queryField: { id?: string | mongoose.Types.ObjectId; _id?: string | mongoose.Types.ObjectId } | null = null;

  // Strategy 1: Try MongoDB '_id' as ObjectId first (most common case for Better Auth)
  if (mongoose.Types.ObjectId.isValid(id)) {
    try {
      const objectId = new mongoose.Types.ObjectId(id);
      user = await db.collection("user").findOne({ _id: objectId });
      if (user) {
        queryField = { _id: objectId };
        console.log(`[findUserByAnyId] ✓ Found user by MongoDB '_id' ObjectId: ${id}`);
        console.log(`[findUserByAnyId] User document keys: ${Object.keys(user).join(", ")}`);
        return { user, queryField };
      }
    } catch (error) {
      console.log(`[findUserByAnyId] Error searching by '_id' ObjectId: ${error}`);
    }
  }

  // Strategy 2: Try Better Auth 'id' field as a string
  try {
    user = await db.collection("user").findOne({ id: id });
    if (user) {
      queryField = { id: id };
      console.log(`[findUserByAnyId] ✓ Found user by Better Auth 'id' string: ${id}`);
      console.log(`[findUserByAnyId] User document keys: ${Object.keys(user).join(", ")}`);
      return { user, queryField };
    }
  } catch (error) {
    console.log(`[findUserByAnyId] Error searching by 'id' string: ${error}`);
  }

  // Strategy 3: If ID is a valid ObjectId, try Better Auth 'id' stored as ObjectId
  if (!user && mongoose.Types.ObjectId.isValid(id)) {
    try {
      const objectId = new mongoose.Types.ObjectId(id);
      user = await db.collection("user").findOne({ id: objectId });
      if (user) {
        queryField = { id: objectId };
        console.log(`[findUserByAnyId] ✓ Found user by Better Auth 'id' ObjectId: ${id}`);
        return { user, queryField };
      }
    } catch (error) {
      console.log(`[findUserByAnyId] Error searching by 'id' ObjectId: ${error}`);
    }
  }

  // Strategy 4: Try '_id' stored as string (fallback)
  if (!user) {
    try {
      user = await db.collection("user").findOne({ _id: id });
      if (user) {
        queryField = { _id: id };
        console.log(`[findUserByAnyId] ✓ Found user by MongoDB '_id' string: ${id}`);
        return { user, queryField };
      }
    } catch (error) {
      console.log(`[findUserByAnyId] Error searching by '_id' string: ${error}`);
    }
  }

  // Debug: Log sample user documents to understand the structure
  try {
    const sampleUsers = await db.collection("user").find({}).limit(2).toArray();
    console.log(`[findUserByAnyId] Sample user documents structure:`, 
      sampleUsers.map((u: any) => ({
        has_id: !!u._id,
        _id_type: typeof u._id,
        _id_value: u._id?.toString?.() || u._id,
        has_id_field: !!u.id,
        id_type: typeof u.id,
        id_value: u.id,
        email: u.email
      }))
    );
  } catch (error) {
    console.log(`[findUserByAnyId] Error fetching sample users: ${error}`);
  }

  console.log(`[findUserByAnyId] ✗ User not found with ID: ${id}`);
  return { user: null, queryField: null };
}

// GET /api/users/[id] - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "users.read",
    ]);
    if (error) return error;

    const { id } = await params;

    await connectDB();

    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;
    const { user: foundUser } = await findUserByAnyId(db, id);

    if (!foundUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: `User not found with ID: ${id}`,
            details: {
              searchedId: id,
              isValidObjectId: mongoose.Types.ObjectId.isValid(id),
            },
          },
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<typeof foundUser> = {
      success: true,
      data: foundUser,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("User GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "USER_FETCH_ERROR",
          message: "Failed to fetch user",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "users.update",
    ]);
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    await connectDB();

    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;
    const { user: existingUser, queryField } = await findUserByAnyId(db, id);

    if (!existingUser || !queryField) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: `User not found with ID: ${id}`,
            details: {
              searchedId: id,
              isValidObjectId: mongoose.Types.ObjectId.isValid(id),
            },
          },
        },
        { status: 404 }
      );
    }

    // Update user fields
    const updateFields: any = { updatedAt: new Date() };
    if (validatedData.name) updateFields.name = validatedData.name;
    if (validatedData.firstName !== undefined)
      updateFields.firstName = validatedData.firstName;
    if (validatedData.lastName !== undefined)
      updateFields.lastName = validatedData.lastName;
    if (validatedData.role) updateFields.role = validatedData.role;

    const updatedUser = await db
      .collection("user")
      .findOneAndUpdate(
        queryField as any,
        { $set: updateFields },
        { returnDocument: "after" }
      );

    if (!updatedUser || !updatedUser.value) {
      throw new Error("Failed to update user");
    }

    // Update password if provided
    if (validatedData.password) {
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);

      // Better Auth stores password in 'account' collection
      // Use the appropriate user ID field for account lookup
      const userIdField = existingUser.id || existingUser._id;
      const accountUpdateResult = await db.collection("account").updateOne(
        { userId: userIdField },
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        }
      );

      console.log(
        `Password update result for user ${userIdField}:`,
        accountUpdateResult
      );
    }

    // Also update in our User model for consistency (if it exists)
    try {
      await User.findOneAndUpdate(
        { email: existingUser.email },
        { $set: updateFields }
      );
    } catch (error) {
      // Ignore if User model doesn't exist or fails
      console.warn("Failed to update User model:", error);
    }

    const response: ApiResponse<typeof updatedUser.value> = {
      success: true,
      data: updatedUser.value,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error("User PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "USER_UPDATE_ERROR",
          message: "Failed to update user",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "users.delete",
    ]);
    if (error) return error;

    const { id } = await params;

    await connectDB();

    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;
    const { user: existingUser, queryField } = await findUserByAnyId(db, id);

    if (!existingUser || !queryField) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: `User not found with ID: ${id}`,
            details: {
              searchedId: id,
              isValidObjectId: mongoose.Types.ObjectId.isValid(id),
            },
          },
        },
        { status: 404 }
      );
    }

    // Prevent deleting yourself - check both id formats
    const currentUserId = (user as any).id || (user as any)._id?.toString();
    const targetUserId = existingUser.id || existingUser._id?.toString();

    if (currentUserId === targetUserId || currentUserId === id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CANNOT_DELETE_SELF",
            message: "Cannot delete your own account",
          },
        },
        { status: 400 }
      );
    }

    // Delete the user
    const deletedUser = await db
      .collection("user")
      .findOneAndDelete(queryField as any);

    if (!deletedUser || !deletedUser.value) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_DELETE_FAILED",
            message: "Failed to delete user from database",
          },
        },
        { status: 500 }
      );
    }

    // Delete associated account record using the correct user ID
    const userIdField = existingUser.id || existingUser._id;
    const accountDeleteResult = await db.collection("account").deleteOne({
      userId: userIdField,
    });

    console.log(
      `Account deletion result for user ${userIdField}:`,
      accountDeleteResult
    );

    // Delete associated session records
    const sessionDeleteResult = await db.collection("session").deleteMany({
      userId: userIdField,
    });

    console.log(
      `Session deletion result for user ${userIdField}:`,
      sessionDeleteResult
    );

    // Also delete from our User model for consistency (if it exists)
    try {
      await User.findOneAndDelete({ email: existingUser.email });
    } catch (error) {
      // Ignore if User model doesn't exist or fails
      console.warn("Failed to delete from User model:", error);
    }

    const response: ApiResponse<{ message: string; deletedUser: any }> = {
      success: true,
      data: {
        message: "User deleted successfully",
        deletedUser: deletedUser.value,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("User DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "USER_DELETE_ERROR",
          message: "Failed to delete user",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
