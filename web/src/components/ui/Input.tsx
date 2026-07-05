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
            className="block text-[11px] font-bold text-cream/70 mb-2 uppercase tracking-[0.18em]"
          >
            {label}
          </label>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full h-12 px-4 rounded-xl",
            "bg-stage/70 border border-border",
            "text-foreground text-base",
            "placeholder:text-foreground/30",
            "transition-all duration-150",
            "focus:outline-none focus:border-cyan focus:bg-stage focus:shadow-cyan-glow-sm",
            "disabled:opacity-50",
            mono && "font-mono uppercase tracking-[0.35em] text-center text-2xl text-cyan",
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