"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-lg sm:text-xl">Something went wrong</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            An unexpected error occurred. Please try refreshing the page or go back to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">
                Error details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground bg-muted p-3 rounded-md overflow-auto max-h-32">
                {error.message}
              </pre>
            </details>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="flex-1"
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
            className="w-full"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

// Error fallback for specific sections
export function ErrorFallback({ 
  error, 
  resetError, 
  title = "Error",
  showDetails = true,
  compact = false 
}: ErrorFallbackProps & { 
  title?: string;
  showDetails?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();

  if (compact) {
    return (
      <div className="flex items-center justify-center p-4 border border-destructive/20 rounded-lg bg-destructive/5">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-5 w-5 text-destructive mx-auto" />
          <p className="text-sm text-destructive font-medium">{title}</p>
          <Button onClick={resetError} size="sm" variant="outline">
            <RefreshCw className="mr-2 h-3 w-3" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive text-base sm:text-lg">{title}</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Something went wrong while loading this section.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {showDetails && error && (
          <details className="mb-4 text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">
              Error details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground bg-muted p-3 rounded-md overflow-auto max-h-24">
              {error.message}
            </pre>
          </details>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={resetError} size="sm" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button 
            onClick={() => router.back()} 
            size="sm" 
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Network error specific fallback
export function NetworkErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <ErrorFallback
      error={new Error("Network connection failed")}
      resetError={resetError}
      title="Connection Error"
      showDetails={false}
    />
  );
}

// Not found error fallback
export function NotFoundErrorFallback({ resetError }: { resetError: () => void }) {
  const router = useRouter();
  
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-muted-foreground">404</h2>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => router.push("/dashboard")}>
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}