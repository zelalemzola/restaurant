import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, helperText, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <div className="relative">
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
              error && "border-destructive focus-visible:ring-destructive",
              success && "border-green-500 focus-visible:ring-green-500",
              className
            )}
            ref={ref}
            {...props}
          />
          {(error || success) && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {error && <AlertCircle className="h-4 w-4 text-destructive" />}
              {success && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>
          )}
        </div>
        {helperText && (
          <p className={cn(
            "text-sm",
            error && "text-destructive",
            success && "text-green-600",
            !error && !success && "text-muted-foreground"
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }