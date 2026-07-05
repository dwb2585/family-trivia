import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "cyan" | "gold" | "danger" | "success" | "violet";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default:
      "bg-cyan/10 text-cyan border-cyan/40",
    cyan:
      "bg-cyan/15 text-cyan border-cyan/50 shadow-cyan-glow-sm",
    gold:
      "bg-gold/15 text-gold border-gold/50",
    violet:
      "bg-violet/15 text-violet border-violet/50",
    danger:
      "bg-danger/15 text-danger border-danger/40",
    success:
      "bg-success/15 text-success border-success/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] border",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}