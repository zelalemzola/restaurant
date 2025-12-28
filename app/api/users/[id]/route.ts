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

// GET /api/users/[id] - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "users.read",
    ]);
    if (error) return error;

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_ID",
            message: "Invalid user ID",
          },
        },
        { status: 400 }
      );
    }

    await connectDB();

    const foundUser = await User.findById(id).select("-__v").lean().exec();

    if (!foundUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
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
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "users.update",
    ]);
    if (error) return error;

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_ID",
            message: "Invalid user ID",
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    await connectDB();

    // Find the user
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    // Update user fields
    const updateFields: any = {};
    if (validatedData.name) updateFields.name = validatedData.name;
    if (validatedData.firstName !== undefined)
      updateFields.firstName = validatedData.firstName;
    if (validatedData.lastName !== undefined)
      updateFields.lastName = validatedData.lastName;
    if (validatedData.role) updateFields.role = validatedData.role;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .select("-__v")
      .lean()
      .exec();

    // Update password if provided
    if (validatedData.password) {
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);

      const { MongoClient } = require("mongodb");
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db("restaurant-erp");

      await db.collection("account").updateOne(
        { userId: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        }
      );

      await client.close();
    }

    const response: ApiResponse<typeof updatedUser> = {
      success: true,
      data: updatedUser,
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
            details: error.errors,
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
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "users.delete",
    ]);
    if (error) return error;

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_ID",
            message: "Invalid user ID",
          },
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Prevent deleting yourself
    if (user.id === id) {
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

    // Find and delete the user
    const deletedUser = await User.findByIdAndDelete(id).lean().exec();

    if (!deletedUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    // Delete associated account record
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db("restaurant-erp");

    await db.collection("account").deleteOne({
      userId: new mongoose.Types.ObjectId(id),
    });

    await client.close();

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "User deleted successfully" },
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
        },
      },
      { status: 500 }
    );
  }
}
