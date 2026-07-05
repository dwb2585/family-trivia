import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "gold" | "danger" | "success";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-card text-foreground/80 border-border",
    gold: "bg-gold/20 text-gold border-gold/40",
    danger: "bg-danger/20 text-danger border-danger/40",
    success: "bg-success/20 text-success border-success/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}