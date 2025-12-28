"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFormValidation, commonValidationRules } from "@/hooks/use-form-validation";
import { useIsMobile } from "@/lib/utils/responsive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface FormFieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  className?: string;
  description?: string;
  rows?: number; // for textarea
}

interface ResponsiveFormProps {
  fields: FormFieldProps[];
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  title?: string;
  description?: string;
  initialValues?: Record<string, any>;
  validationRules?: Record<string, any>;
  className?: string;
  layout?: "vertical" | "horizontal" | "grid";
  columns?: 1 | 2 | 3;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export function ResponsiveForm({
  fields,
  onSubmit,
  onCancel,
  submitText = "Submit",
  cancelText = "Cancel",
  title,
  description,
  initialValues = {},
  validationRules = {},
  className,
  layout = "vertical",
  columns = 1,
  showSuccessToast = true,
  showErrorToast = true,
}: ResponsiveFormProps) {
  const isMobile = useIsMobile();
  
  // Generate validation rules from field definitions
  const generatedRules = React.useMemo(() => {
    const rules: Record<string, any> = { ...validationRules };
    
    fields.forEach(field => {
      if (!rules[field.name]) {
        rules[field.name] = {};
      }
      
      if (field.required) {
        rules[field.name].required = true;
      }
      
      // Add common validation rules based on field type
      switch (field.type) {
        case "email":
          rules[field.name] = { ...rules[field.name], ...commonValidationRules.email };
          break;
        case "password":
          rules[field.name] = { ...rules[field.name], ...commonValidationRules.password };
          break;
        case "tel":
          rules[field.name] = { ...rules[field.name], ...commonValidationRules.phone };
          break;
        case "url":
          rules[field.name] = { ...rules[field.name], ...commonValidationRules.url };
          break;
        case "number":
          rules[field.name] = { ...rules[field.name], ...commonValidationRules.positiveNumber };
          break;
      }
    });
    
    return rules;
  }, [fields, validationRules]);

  const {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleSubmit,
    getFieldProps,
  } = useFormValidation({
    initialValues,
    validationRules: generatedRules,
    showSuccessToast,
    showErrorToast,
  });

  const renderField = (field: FormFieldProps) => {
    const fieldProps = getFieldProps(field.name);
    const hasError = touched[field.name] && errors[field.name];
    const hasSuccess = touched[field.name] && !errors[field.name] && values[field.name];

    const fieldId = `field-${field.name}`;

    return (
      <div key={field.name} className={cn("space-y-2", field.className)}>
        <Label 
          htmlFor={fieldId}
          className={cn(
            "text-sm font-medium",
            hasError && "text-destructive",
            hasSuccess && "text-green-600"
          )}
        >
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>

        {field.type === "textarea" ? (
          <div className="relative">
            <Textarea
              id={fieldId}
              placeholder={field.placeholder}
              disabled={field.disabled || isSubmitting}
              rows={field.rows || 3}
              className={cn(
                hasError && "border-destructive focus-visible:ring-destructive",
                hasSuccess && "border-green-500 focus-visible:ring-green-500"
              )}
              {...fieldProps}
            />
            {(hasError || hasSuccess) && (
              <div className="absolute right-3 top-3">
                {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
                {hasSuccess && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </div>
            )}
          </div>
        ) : field.type === "select" ? (
          <Select
            value={fieldProps.value}
            onValueChange={(value) => fieldProps.onChange({ target: { value } } as any)}
            disabled={field.disabled || isSubmitting}
          >
            <SelectTrigger
              className={cn(
                hasError && "border-destructive focus:ring-destructive",
                hasSuccess && "border-green-500 focus:ring-green-500"
              )}
            >
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="relative">
            <Input
              id={fieldId}
              type={field.type || "text"}
              placeholder={field.placeholder}
              disabled={field.disabled || isSubmitting}
              className={cn(
                hasError && "border-destructive focus-visible:ring-destructive",
                hasSuccess && "border-green-500 focus-visible:ring-green-500"
              )}
              {...{ ...fieldProps, error: !!hasError }}
            />
            {(hasError || hasSuccess) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
                {hasSuccess && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </div>
            )}
          </div>
        )}

        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}

        {hasError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors[field.name]}
          </p>
        )}
      </div>
    );
  };

  const getLayoutClasses = () => {
    if (layout === "horizontal" && !isMobile) {
      return "grid grid-cols-2 gap-x-6 gap-y-4 items-end";
    }
    
    if (layout === "grid") {
      const cols = isMobile ? 1 : columns;
      return `grid grid-cols-${cols} gap-4`;
    }
    
    return "space-y-4";
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(onSubmit);
      }}
      className={cn("space-y-6", className)}
    >
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <fieldset disabled={isSubmitting} className={getLayoutClasses()}>
        {fields.map(renderField)}
      </fieldset>

      <div className={cn(
        "flex gap-3 pt-4",
        isMobile ? "flex-col-reverse" : "flex-row justify-end"
      )}>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className={isMobile ? "w-full" : ""}
          >
            {cancelText}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !isValid}
          className={isMobile ? "w-full" : ""}
        >
          {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
          {submitText}
        </Button>
      </div>
    </form>
  );
}

// Quick form builder for common use cases
export function QuickForm({
  fields,
  onSubmit,
  ...props
}: {
  fields: (Omit<FormFieldProps, 'name'> & { name: string })[];
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
} & Partial<ResponsiveFormProps>) {
  return (
    <ResponsiveForm
      fields={fields}
      onSubmit={onSubmit}
      {...props}
    />
  );
}