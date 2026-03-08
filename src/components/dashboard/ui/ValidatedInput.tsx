"use client";

import { useCallback, useState } from "react";
import {
  validateField,
  shouldShowError,
  type ValidationRule,
} from "@/lib/validation";

type ValidatedInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
  rules?: ValidationRule[];
  showErrorOn?: "blur" | "change";
};

export function ValidatedInput({
  value,
  onChange,
  rules = [],
  showErrorOn = "change",
  className = "",
  ...rest
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false);
  const error = rules.length > 0 ? validateField(value, rules) : null;
  const showError = shouldShowError(value, touched, error);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      if (showErrorOn === "change") setTouched(true);
    },
    [onChange, showErrorOn],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      rest.onBlur?.(e);
    },
    [rest.onBlur],
  );

  return (
    <div className="w-full">
      <input
        {...rest}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`${className} ${showError ? "border-[#ef4444] focus:border-[#ef4444]" : ""}`}
        aria-invalid={showError}
        aria-describedby={showError ? `${rest.id ?? "field"}-error` : undefined}
      />
      {showError && (
        <p
          id={`${rest.id ?? "field"}-error`}
          className="mt-1 text-[12px] text-[#ef4444]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

type ValidatedTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
  rules?: ValidationRule[];
  showErrorOn?: "blur" | "change";
};

export function ValidatedTextarea({
  value,
  onChange,
  rules = [],
  showErrorOn = "change",
  className = "",
  ...rest
}: ValidatedTextareaProps) {
  const [touched, setTouched] = useState(false);
  const error = rules.length > 0 ? validateField(value, rules) : null;
  const showError = shouldShowError(value, touched, error);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      if (showErrorOn === "change") setTouched(true);
    },
    [onChange, showErrorOn],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setTouched(true);
      rest.onBlur?.(e);
    },
    [rest.onBlur],
  );

  return (
    <div className="w-full">
      <textarea
        {...rest}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`${className} ${showError ? "border-[#ef4444] focus:border-[#ef4444]" : ""}`}
        aria-invalid={showError}
        aria-describedby={showError ? `${rest.id ?? "field"}-error` : undefined}
      />
      {showError && (
        <p
          id={`${rest.id ?? "field"}-error`}
          className="mt-1 text-[12px] text-[#ef4444]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
