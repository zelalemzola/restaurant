// User management API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { withAuthAndPermissions } from "@/lib/middleware/audit-rbac";
import bcrypt from "bcryptjs";
import { z } from "zod";
import mongoose from "mongoose";
import {
  validateUserCreationData,
  sanitizeUserData,
  checkPasswordStrength,
  type CreateUserData,
} from "@/lib/utils/user-validation";
import {
  AuthLogger,
  AuthPerformanceMonitor,
  AuthSecurityMonitor,
} from "@/lib/utils/auth-logger";

export const runtime = "nodejs";

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name too long")
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name too long")
    .optional(),
  role: z.enum(["admin", "manager", "user"], {
    message: "Role must be admin, manager, or user",
  }),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");
    const role = searchParams.get("role");

    await connectDB();

    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

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

    const [rawUsers, total] = await Promise.all([
      mongoose.connection.db
        .collection("user")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      mongoose.connection.db.collection("user").countDocuments(query),
    ]);

    // Normalize IDs so the frontend can reliably use _id as a string
    const users = rawUsers.map((u: any) => {
      const stringId =
        typeof u._id === "string" ? u._id : u._id?.toString?.() ?? undefined;
      return {
        ...u,
        _id: stringId,
        // Ensure there's also a plain string id field; prefer Better Auth id if present
        id: typeof u.id === "string" ? u.id : stringId,
      };
    });

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
  const performanceMonitor = new AuthPerformanceMonitor("USER_CREATION");
  let validatedData: CreateUserData | null = null;

  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "users.create",
    ]);
    if (error) {
      AuthLogger.logSecurityEvent("UNAUTHORIZED_USER_CREATION", undefined, {
        requestingUser: user?.email || "unknown",
      });
      return error;
    }

    const requestingUserEmail = user?.email || "unknown";

    const body = await request.json();
    const sanitizedData = sanitizeUserData(body);

    AuthLogger.logUserCreationStart(
      sanitizedData.email || "unknown",
      requestingUserEmail
    );

    // Enhanced validation with detailed error logging
    const validationResult = validateUserCreationData(sanitizedData);

    if (!validationResult.success) {
      AuthLogger.logValidationError(
        sanitizedData.email || "unknown",
        validationResult.errors || [],
        requestingUserEmail
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: validationResult.errors,
          },
        },
        { status: 400 }
      );
    }

    validatedData = validationResult.data!;

    // Check password strength
    const passwordStrength = checkPasswordStrength(validatedData.password);
    if (!passwordStrength.isValid) {
      AuthLogger.logValidationError(
        validatedData.email,
        [{ message: "Password too weak", feedback: passwordStrength.feedback }],
        requestingUserEmail
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "WEAK_PASSWORD",
            message: "Password does not meet security requirements",
            details: {
              feedback: passwordStrength.feedback,
              score: passwordStrength.score,
            },
          },
        },
        { status: 400 }
      );
    }

    // Security check - rate limiting
    if (!AuthSecurityMonitor.recordAttempt(validatedData.email)) {
      AuthLogger.logSecurityEvent("RATE_LIMITED", validatedData.email, {
        requestingUser: requestingUserEmail,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many user creation attempts. Please try again later.",
          },
        },
        { status: 429 }
      );
    }

    await connectDB();

    // Check if user with same email already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      console.error("User creation failed - email already exists:", {
        email: validatedData.email,
        existingUserId: existingUser._id,
        timestamp: new Date().toISOString(),
      });

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "USER_EXISTS",
          message: "User with this email already exists",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    try {
      // Use better-auth's internal API to create the user properly
      console.log("Creating user via better-auth for:", validatedData.email);

      // Import auth instance to use internal methods
      const { auth } = await import("@/lib/auth");

      // Create user using better-auth's internal API with all fields
      const createUserResult = await auth.api.signUpEmail({
        body: {
          email: validatedData.email,
          password: validatedData.password,
          name: validatedData.name,
          role: validatedData.role,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
        },
      });

      if (!createUserResult || !createUserResult.user) {
        throw new Error("Failed to create user via better-auth");
      }

      const userId = createUserResult.user.id;
      console.log("User created successfully with ID:", userId);

      // Ensure the user is email verified for admin-created users
      console.log("Setting email verification for admin-created user...");

      if (mongoose.connection.db) {
        await mongoose.connection.db.collection("user").updateOne(
          { id: userId },
          {
            $set: {
              emailVerified: new Date(),
              updatedAt: new Date(),
            },
          }
        );
      }

      console.log("User fields updated successfully for:", validatedData.email);

      // Return user without sensitive data
      const userResponse = {
        id: userId,
        email: validatedData.email,
        name: validatedData.name,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role,
        emailVerified: new Date(),
        createdAt: createUserResult.user.createdAt,
        updatedAt: new Date(),
      };

      // Test login to verify the user can authenticate
      console.log(`Testing login for created user: ${validatedData.email}`);

      try {
        const loginResult = await auth.api.signInEmail({
          body: {
            email: validatedData.email,
            password: validatedData.password,
          },
        });

        if (loginResult && loginResult.user) {
          console.log(`✓ Login test successful for: ${validatedData.email}`);
        } else {
          console.warn(`Login test failed for ${validatedData.email}`);
        }
      } catch (loginTestError) {
        console.warn("Login test error:", loginTestError);
      }

      const response: ApiResponse<typeof userResponse> = {
        success: true,
        data: userResponse,
      };

      const executionTime = performanceMonitor.end(true, validatedData.email);
      AuthLogger.logUserCreationSuccess(
        validatedData.email,
        userId.toString(),
        requestingUserEmail,
        executionTime
      );

      return NextResponse.json(response, { status: 201 });
    } catch (dbError) {
      AuthLogger.logDatabaseOperation(
        "USER_CREATION",
        validatedData?.email || "unknown",
        false,
        dbError instanceof Error ? dbError.message : "Unknown database error",
        {
          userId: "not created",
          stack: dbError instanceof Error ? dbError.stack : undefined,
        }
      );

      throw dbError;
    }
  } catch (error) {
    const executionTime = performanceMonitor.end(false, validatedData?.email);
    const requestingUserEmail = "unknown"; // Fallback since we're in catch block

    if (error instanceof z.ZodError) {
      AuthLogger.logUserCreationFailure(
        validatedData?.email || "unknown",
        requestingUserEmail,
        "Validation error",
        executionTime,
        { validationErrors: error.issues }
      );

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

    AuthLogger.logUserCreationFailure(
      validatedData?.email || "unknown",
      requestingUserEmail,
      error instanceof Error ? error.message : "Unknown error",
      executionTime,
      {
        userId: "not created",
        stack: error instanceof Error ? error.stack : undefined,
      }
    );

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
