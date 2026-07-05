import * as React from "react";
import { cn } from "@/lib/utils";
import { FAMILY, FamilyMember } from "@/lib/family";

interface SelectProps {
  label?: string;
  /** Selected fullName (e.g. "Daniel Wobbekind"), or "" for none */
  value: string;
  onChange: (value: string) => void;
  /** Optional subset of family to show; defaults to all */
  members?: FamilyMember[];
  /** Placeholder text for the "unselected" option */
  placeholder?: string;
  /** Extra option appended at the bottom (e.g. "Custom…") */
  extraOption?: { label: string; value: string };
  /** Allow user to type a custom name not in the family list */
  allowCustom?: boolean;
  className?: string;
  id?: string;
}

/**
 * FamilyMemberSelect — large-tap-target dropdown listing every CWABS family
 * member with their letter badge + emoji avatar. Selected member gets a
 * preview card underneath. Falls back to a custom-text input if the user
 * wants a name not in the roster.
 *
 * Uses the native iOS/Android picker sheet on touch devices.
 */
export function FamilyMemberSelect({
  label,
  value,
  onChange,
  members = FAMILY,
  placeholder = "Pick your name…",
  extraOption,
  allowCustom = false,
  className,
  id,
}: SelectProps) {
  const selectId = id || React.useId();
  const [customMode, setCustomMode] = React.useState(false);
  const [customValue, setCustomValue] = React.useState("");

  const selected =
    members.find((m) => m.fullName === value) ||
    FAMILY.find((m) => m.fullName === value);

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wider"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <select
          id={selectId}
          value={customMode ? "__custom__" : value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") {
              setCustomMode(true);
              return;
            }
            setCustomMode(false);
            onChange(v);
          }}
          className={cn(
            "w-full h-14 px-4 pr-10 rounded-xl appearance-none cursor-pointer",
            "bg-stage/60 border-2",
            selected ? "border-gold/60" : "border-border",
            "text-foreground text-lg font-semibold",
            "transition-colors duration-150",
            "focus:outline-none focus:border-gold focus:bg-stage",
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {members.map((m) => (
            <option key={`${m.firstName}-${m.lastName}`} value={m.fullName}>
              {m.emoji}  {m.letter} · {m.fullName}
            </option>
          ))}
          {extraOption ? (
            <option value={extraOption.value}>{extraOption.label}</option>
          ) : null}
          {allowCustom ? <option value="__custom__">✏️  Custom name…</option> : null}
        </select>

        {/* Chevron */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gold text-xl">
          ▾
        </div>
      </div>

      {customMode ? (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Type your name"
            className={cn(
              "flex-1 h-12 px-4 rounded-xl",
              "bg-stage/60 border-2 border-gold",
              "text-foreground text-lg",
              "placeholder:text-foreground/30",
              "focus:outline-none focus:bg-stage",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customValue.trim()) {
                onChange(customValue.trim());
                setCustomMode(false);
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (customValue.trim()) {
                onChange(customValue.trim());
                setCustomMode(false);
              }
            }}
            className="px-4 h-12 rounded-xl bg-gold text-stage font-bold"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomMode(false);
              setCustomValue("");
            }}
            className="px-3 h-12 rounded-xl bg-stage/60 text-foreground/70 border border-border"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Selected preview card — shows the chosen member's CWABS letter big */}
      {selected ? (
        <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-stage/40 border border-gold/30">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center font-display text-2xl text-stage"
            style={{ background: selected.color }}
          >
            {selected.letter}
          </div>
          <div className="flex-1">
            <div className="text-xs text-foreground/50 uppercase tracking-wider">
              Playing as
            </div>
            <div className="text-lg font-bold text-foreground">
              {selected.emoji} {selected.firstName} {selected.lastName}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}