// User management API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { withAuthAndPermissions } from "@/lib/middleware/audit-rbac";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const runtime = "nodejs";

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "manager", "user"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

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

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "users.read",
    ]);
    if (error) return error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");
    const role = searchParams.get("role");

    // Build query
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role && ["admin", "manager", "user"].includes(role)) {
      query.role = role;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-__v") // Exclude version field
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      User.countDocuments(query).exec(),
    ]);

    const response: ApiResponse<{
      users: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "USERS_FETCH_ERROR",
          message: "Failed to fetch users",
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "users.create",
    ]);
    if (error) return error;

    const body = await request.json();

    // Validate request body
    const validatedData = createUserSchema.parse(body);

    await connectDB();

    // Check if user with same email already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "USER_EXISTS",
          message: "User with this email already exists",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const newUser = new User({
      email: validatedData.email,
      name: validatedData.name,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      role: validatedData.role,
      emailVerified: new Date(), // Auto-verify for admin-created users
    });

    await newUser.save();

    // Create account record for authentication
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db("restaurant-erp");

    await db.collection("account").insertOne({
      userId: newUser._id,
      accountId: `email:${validatedData.email}`,
      providerId: "credential",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await client.close();

    // Return user without sensitive data
    const userResponse = {
      _id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      emailVerified: newUser.emailVerified,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    const response: ApiResponse<typeof userResponse> = {
      success: true,
      data: userResponse,
    };

    return NextResponse.json(response, { status: 201 });
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

    console.error("Users POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "USER_CREATE_ERROR",
          message: "Failed to create user",
        },
      },
      { status: 500 }
    );
  }
}
