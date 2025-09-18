// ESLINT-LENIENT: screened 2025-09-17 (CareCircle)
// Path: src/components/ui/Input.tsx
"use client";

import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "default" | "filled";
type Size = "sm" | "md" | "lg";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
};

const sizePad: Record<Size, string> = {
  sm: "h-9 text-sm",
  md: "h-11 text-sm",
  lg: "h-12 text-base",
};

const baseInput =
  "w-full rounded-2xl border shadow-sm outline-none transition focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  default:
    "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-sky-300",
  filled:
    "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-sky-300",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      leftIcon,
      rightIcon,
      error,
      helperText,
      type = "text",
      ...props
    },
    ref
  ) => {
    const hasLeft = Boolean(leftIcon);
    const hasRight = Boolean(rightIcon);

    return (
      <div className={cn("w-full", className)}>
        <div className="relative">
          {hasLeft ? (
            <span
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-slate-400"
              )}
              aria-hidden
            >
              <span className={cn(size === "lg" ? "h-5 w-5" : "h-4 w-4")}>
                {leftIcon}
              </span>
            </span>
          ) : null}

          <input
            ref={ref}
            type={type}
            className={cn(
              baseInput,
              variants[variant],
              sizePad[size],
              hasLeft && "pl-10",
              hasRight && "pr-10",
              error && "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
            )}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={helperText ? "input-help" : undefined}
            {...props}
          />

          {hasRight ? (
            <span
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 text-slate-400"
              )}
              aria-hidden
            >
              <span className={cn(size === "lg" ? "h-5 w-5" : "h-4 w-4")}>
                {rightIcon}
              </span>
            </span>
          ) : null}
        </div>

        {error ? (
          <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>
        ) : helperText ? (
          <p id="input-help" className="mt-1 text-xs text-slate-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;
