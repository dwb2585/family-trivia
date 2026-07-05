import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "surface-card shadow-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 pt-6 pb-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("font-display text-xl tracking-wide", className)} {...props}>
      {children}
    </h2>
  );
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 pb-6", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * GlowCard — wraps Card with a gradient cyan/violet border and subtle
 * glow. Use as a centerpiece (e.g. game-code badge, final winner card).
 */
export function GlowCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-2xl bg-card/80 backdrop-blur-md",
        "shadow-cyan-glow",
        "before:absolute before:inset-0 before:rounded-2xl before:p-[1.5px]",
        "before:bg-gradient-to-br before:from-cyan before:via-violet before:to-cyan",
        "before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]",
        "before:[-webkit-mask-composite:xor] before:[mask-composite:exclude]",
        "before:pointer-events-none",
        className,
      )}
      {...props}
    >
      <div className="relative rounded-2xl">{children}</div>
    </div>
  );
}