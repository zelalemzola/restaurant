// Authentication and user management logging utilities

export interface AuthLogContext {
  operation: string;
  email?: string;
  userId?: string;
  requestingUser?: string;
  timestamp: string;
  executionTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export class AuthLogger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  private static log(
    level: "info" | "warn" | "error",
    context: AuthLogContext
  ): void {
    const logEntry = {
      level,
      ...context,
      timestamp: context.timestamp || this.formatTimestamp(),
    };

    switch (level) {
      case "info":
        console.log(`[AUTH-INFO] ${context.operation}:`, logEntry);
        break;
      case "warn":
        console.warn(`[AUTH-WARN] ${context.operation}:`, logEntry);
        break;
      case "error":
        console.error(`[AUTH-ERROR] ${context.operation}:`, logEntry);
        break;
    }
  }

  static logUserCreationStart(email: string, requestingUser: string): void {
    this.log("info", {
      operation: "USER_CREATION_START",
      email,
      requestingUser,
      timestamp: this.formatTimestamp(),
    });
  }

  static logUserCreationSuccess(
    email: string,
    userId: string,
    requestingUser: string,
    executionTime: number
  ): void {
    this.log("info", {
      operation: "USER_CREATION_SUCCESS",
      email,
      userId,
      requestingUser,
      executionTime,
      timestamp: this.formatTimestamp(),
    });
  }

  static logUserCreationFailure(
    email: string,
    requestingUser: string,
    error: string,
    executionTime: number,
    details?: Record<string, any>
  ): void {
    this.log("error", {
      operation: "USER_CREATION_FAILURE",
      email,
      requestingUser,
      error,
      executionTime,
      details,
      timestamp: this.formatTimestamp(),
    });
  }

  static logValidationError(
    email: string,
    errors: any[],
    requestingUser?: string
  ): void {
    this.log("warn", {
      operation: "USER_VALIDATION_ERROR",
      email,
      requestingUser,
      details: { validationErrors: errors },
      timestamp: this.formatTimestamp(),
    });
  }

  static logAuthenticationAttempt(email: string, success: boolean): void {
    this.log(success ? "info" : "warn", {
      operation: success ? "AUTH_SUCCESS" : "AUTH_FAILURE",
      email,
      timestamp: this.formatTimestamp(),
    });
  }

  static logPasswordVerification(
    email: string,
    userId: string,
    success: boolean,
    details?: Record<string, any>
  ): void {
    this.log(success ? "info" : "error", {
      operation: success
        ? "PASSWORD_VERIFICATION_SUCCESS"
        : "PASSWORD_VERIFICATION_FAILURE",
      email,
      userId,
      details,
      timestamp: this.formatTimestamp(),
    });
  }

  static logDatabaseOperation(
    operation: string,
    email: string,
    success: boolean,
    error?: string,
    details?: Record<string, any>
  ): void {
    this.log(success ? "info" : "error", {
      operation: `DB_${operation.toUpperCase()}`,
      email,
      error,
      details,
      timestamp: this.formatTimestamp(),
    });
  }

  static logSecurityEvent(
    event: string,
    email?: string,
    details?: Record<string, any>
  ): void {
    this.log("warn", {
      operation: `SECURITY_${event.toUpperCase()}`,
      email,
      details,
      timestamp: this.formatTimestamp(),
    });
  }
}

// Performance monitoring utility
export class AuthPerformanceMonitor {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
  }

  end(success: boolean, email?: string, details?: Record<string, any>): number {
    const executionTime = Date.now() - this.startTime;

    if (executionTime > 5000) {
      // Log slow operations (>5s)
      AuthLogger.logSecurityEvent("SLOW_OPERATION", email, {
        operation: this.operation,
        executionTime,
        ...details,
      });
    }

    return executionTime;
  }
}

// Rate limiting and security monitoring
export class AuthSecurityMonitor {
  private static attempts = new Map<
    string,
    { count: number; lastAttempt: number }
  >();

  static recordAttempt(email: string): boolean {
    const now = Date.now();
    const key = email.toLowerCase();
    const existing = this.attempts.get(key);

    if (!existing) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset counter if more than 15 minutes have passed
    if (now - existing.lastAttempt > 15 * 60 * 1000) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }

    existing.count++;
    existing.lastAttempt = now;

    // Log suspicious activity
    if (existing.count > 5) {
      AuthLogger.logSecurityEvent("EXCESSIVE_ATTEMPTS", email, {
        attemptCount: existing.count,
        timeWindow: "15 minutes",
      });
      return false;
    }

    return true;
  }

  static isBlocked(email: string): boolean {
    const key = email.toLowerCase();
    const existing = this.attempts.get(key);

    if (!existing) return false;

    const now = Date.now();

    // Unblock after 15 minutes
    if (now - existing.lastAttempt > 15 * 60 * 1000) {
      this.attempts.delete(key);
      return false;
    }

    return existing.count > 10; // Block after 10 attempts
  }
}
