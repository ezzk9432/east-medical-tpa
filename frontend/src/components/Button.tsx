import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
          variant === "primary" && "bg-teal-700 text-white hover:bg-teal-800",
          variant === "secondary" &&
            "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
          variant === "ghost" && "text-slate-700 hover:bg-slate-100",
          variant === "danger" && "bg-rose-500 text-white hover:bg-rose-600",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
