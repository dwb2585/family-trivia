import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  /** Adds a "shimmer" highlight overlay — useful for primary CTAs */
  shimmer?: boolean;
}

const variants: Record<Variant, string> = {
  // Primary — cyan gradient with glow, the main "go" affordance
  primary:
    "bg-gradient-to-br from-cyan to-violet text-primary-foreground shadow-btn-cyan glow-pulse-cyan btn-3d",
  // Gold — second primary, used for big welcoming CTAs (host a game, etc.)
  gold:
    "bg-gradient-to-br from-gold to-[hsl(38,100%,72%)] text-stage shadow-btn-gold btn-3d glow-pulse-cyan",
  // Secondary — dark surface with gradient border, for second-place CTAs
  secondary:
    "bg-card text-foreground border border-border hover:border-cyan/60 hover:bg-cyan/5",
  ghost:
    "bg-transparent text-foreground/70 hover:bg-card hover:text-foreground",
  danger:
    "bg-gradient-to-br from-red to-[hsl(355,95%,55%)] text-destructive-foreground btn-3d",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm rounded-lg",
  md: "h-12 px-5 text-base rounded-xl",
  lg: "h-14 px-7 text-lg rounded-xl",
  xl: "h-16 px-8 text-xl rounded-2xl",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      fullWidth,
      shimmer = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 font-bold font-display",
          "transition-all duration-150 select-none overflow-hidden",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-stage",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {/* Shimmer highlight sweep */}
        {shimmer && !disabled ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer"
            style={{
              background:
                "linear-gradient(110deg, transparent 0%, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
          />
        ) : null}
        <span className="relative z-10 inline-flex items-center gap-2">
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : null}
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";