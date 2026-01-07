import { z } from "zod";

// Enhanced user validation schema
export const createUserValidationSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .max(254, "Email too long")
    .toLowerCase()
    .trim(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .trim()
    .refine((name) => name.length > 0, "Name cannot be empty after trimming"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name too long")
    .trim()
    .optional()
    .or(z.literal("")),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name too long")
    .trim()
    .optional()
    .or(z.literal("")),
  role: z.enum(["admin", "manager", "user"] as const, {
    message: "Role must be admin, manager, or user",
  }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    )
    .refine(
      (password) => !/\s/.test(password),
      "Password cannot contain spaces"
    ),
});

export type CreateUserData = z.infer<typeof createUserValidationSchema>;

// Validation result type
export interface ValidationResult {
  success: boolean;
  data?: CreateUserData;
  errors?: z.ZodIssue[];
}

// Enhanced validation function
export function validateUserCreationData(data: any): ValidationResult {
  try {
    const validatedData = createUserValidationSchema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues,
      };
    }
    throw error;
  }
}

// Email validation utility
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Password strength checker
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push("Password should be at least 8 characters long");

  if (/[a-z]/.test(password)) score++;
  else feedback.push("Password should contain lowercase letters");

  if (/[A-Z]/.test(password)) score++;
  else feedback.push("Password should contain uppercase letters");

  if (/\d/.test(password)) score++;
  else feedback.push("Password should contain numbers");

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else
    feedback.push(
      "Password should contain special characters for better security"
    );

  return {
    score,
    feedback,
    isValid: score >= 4, // Require at least 4 criteria
  };
}

// User data sanitization
export function sanitizeUserData(data: any): Partial<CreateUserData> {
  return {
    email:
      typeof data.email === "string" ? data.email.toLowerCase().trim() : "",
    name: typeof data.name === "string" ? data.name.trim() : "",
    firstName:
      typeof data.firstName === "string" ? data.firstName.trim() : undefined,
    lastName:
      typeof data.lastName === "string" ? data.lastName.trim() : undefined,
    role: ["admin", "manager", "user"].includes(data.role) ? data.role : "user",
    password: typeof data.password === "string" ? data.password : "",
  };
}
