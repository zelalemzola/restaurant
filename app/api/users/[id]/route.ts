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
async function findUserByAnyId(db: any, id: string) {
  console.log(`Looking up user with ID: ${id}`);

  let user = null;
  let queryField = null;

  // First try by Better Auth 'id' field (if it exists)
  try {
    user = await db.collection("user").findOne({ id: id });
    if (user) {
      queryField = { id: id };
      console.log(`Found user by Better Auth 'id' field: ${id}`);
      return { user, queryField };
    }
  } catch (error) {
    console.log(`Error searching by 'id' field: ${error}`);
  }

  // If not found and ID is a valid ObjectId, try by MongoDB '_id' field
  if (!user && mongoose.Types.ObjectId.isValid(id)) {
    try {
      const objectId = new mongoose.Types.ObjectId(id);
      user = await db.collection("user").findOne({ _id: objectId });
      if (user) {
        queryField = { _id: objectId };
        console.log(`Found user by MongoDB '_id' field: ${id}`);
        return { user, queryField };
      }
    } catch (error) {
      console.log(`Error searching by '_id' field: ${error}`);
    }
  }

  console.log(`User not found with ID: ${id}`);
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
        queryField,
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
      .findOneAndDelete(queryField);

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
