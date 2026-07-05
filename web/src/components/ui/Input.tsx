import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, mono, id, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wider"
          >
            {label}
          </label>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full h-12 px-4 rounded-xl",
            "bg-stage/60 border-2 border-border",
            "text-foreground text-lg",
            "placeholder:text-foreground/30",
            "transition-colors duration-150",
            "focus:outline-none focus:border-gold focus:bg-stage",
            "disabled:opacity-50",
            mono && "font-mono uppercase tracking-[0.3em] text-center text-2xl",
            error && "border-danger",
            className,
          )}
          {...props}
        />
        {error ? <p className="text-danger text-sm mt-1.5">{error}</p> : null}
      </div>
    );
  },
);
Input.displayName = "Input";