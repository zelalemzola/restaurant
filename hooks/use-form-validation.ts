"use client";

import { useState, useCallback, useEffect } from "react";
import { toastHelpers } from "@/hooks/use-toast";

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface FormState {
  [key: string]: any;
}

interface FormErrors {
  [key: string]: string;
}

interface UseFormValidationOptions {
  initialValues?: FormState;
  validationRules?: ValidationRules;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export function useFormValidation({
  initialValues = {},
  validationRules = {},
  validateOnChange = true,
  validateOnBlur = true,
  showSuccessToast = false,
  showErrorToast = true,
}: UseFormValidationOptions = {}) {
  const [values, setValues] = useState<FormState>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    (name: string, value: any): string => {
      const rules = validationRules[name];
      if (!rules) return "";

      // Required validation
      if (
        rules.required &&
        (!value || (typeof value === "string" && value.trim() === ""))
      ) {
        return `${name} is required`;
      }

      // Skip other validations if field is empty and not required
      if (!value || (typeof value === "string" && value.trim() === "")) {
        return "";
      }

      // String validations
      if (typeof value === "string") {
        if (rules.minLength && value.length < rules.minLength) {
          return `${name} must be at least ${rules.minLength} characters`;
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          return `${name} must be no more than ${rules.maxLength} characters`;
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          return `${name} format is invalid`;
        }
      }

      // Number validations
      if (typeof value === "number" || !isNaN(Number(value))) {
        const numValue = Number(value);
        if (rules.min !== undefined && numValue < rules.min) {
          return `${name} must be at least ${rules.min}`;
        }
        if (rules.max !== undefined && numValue > rules.max) {
          return `${name} must be no more than ${rules.max}`;
        }
      }

      // Custom validation
      if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) return customError;
      }

      return "";
    },
    [validationRules]
  );

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let hasErrors = false;

    Object.keys(validationRules).forEach((name) => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  }, [values, validateField, validationRules]);

  // Update form validity when values or errors change
  useEffect(() => {
    const formIsValid =
      Object.keys(errors).length === 0 &&
      Object.keys(validationRules).every((name) => {
        const rules = validationRules[name];
        if (rules.required) {
          const value = values[name];
          return value && (typeof value !== "string" || value.trim() !== "");
        }
        return true;
      });
    setIsValid(formIsValid);
  }, [values, errors, validationRules]);

  // Handle field change
  const handleChange = useCallback(
    (name: string, value: any) => {
      setValues((prev) => ({ ...prev, [name]: value }));

      if (validateOnChange && touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [validateField, validateOnChange, touched]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (name: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }));

      if (validateOnBlur) {
        const error = validateField(name, values[name]);
        setErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [validateField, validateOnBlur, values]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (
      onSubmit: (values: FormState) => Promise<void> | void,
      onError?: (error: Error) => void
    ) => {
      setIsSubmitting(true);

      try {
        // Mark all fields as touched
        const allTouched = Object.keys(validationRules).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {} as { [key: string]: boolean });
        setTouched(allTouched);

        // Validate form
        const isFormValid = validateForm();

        if (!isFormValid) {
          if (showErrorToast) {
            toastHelpers.error("Please fix the errors in the form");
          }
          return;
        }

        // Submit form
        await onSubmit(values);

        if (showSuccessToast) {
          toastHelpers.success("Form submitted successfully");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";

        if (showErrorToast) {
          toastHelpers.error(errorMessage);
        }

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validationRules, validateForm, showSuccessToast, showErrorToast]
  );

  // Reset form
  const reset = useCallback(
    (newValues?: FormState) => {
      setValues(newValues || initialValues);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    },
    [initialValues]
  );

  // Set field error manually
  const setFieldError = useCallback((name: string, error: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  // Clear field error
  const clearFieldError = useCallback((name: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback(
    (name: string) => ({
      value: values[name] || "",
      error: touched[name] && errors[name],
      success: touched[name] && !errors[name] && values[name],
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => {
        handleChange(name, e.target.value);
      },
      onBlur: () => handleBlur(name),
    }),
    [values, errors, touched, handleChange, handleBlur]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldError,
    clearFieldError,
    getFieldProps,
    validateForm,
    validateField,
  };
}

// Common validation rules
export const commonValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    required: true,
    minLength: 8,
  },
  phone: {
    pattern: /^\+?[\d\s\-\(\)]+$/,
  },
  url: {
    pattern: /^https?:\/\/.+/,
  },
  positiveNumber: {
    min: 0,
    custom: (value: any) => {
      if (isNaN(Number(value))) return "Must be a valid number";
      return null;
    },
  },
  requiredString: {
    required: true,
    minLength: 1,
  },
};
