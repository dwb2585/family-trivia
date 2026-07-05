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
 * wants a name not in the roster. Uses the native iOS/Android picker sheet.
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
          className="block text-[11px] font-bold text-cream/70 mb-2 uppercase tracking-[0.18em]"
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
            "bg-stage/70 border-2",
            selected ? "border-cyan/60 shadow-cyan-glow-sm" : "border-border",
            "text-foreground text-base font-semibold",
            "transition-all duration-150",
            "focus:outline-none focus:border-cyan focus:bg-stage",
          )}
          style={{
            // Native options panel: dark + readable
            colorScheme: "dark",
          }}
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
          {allowCustom ? <option value="__custom__">Custom name…</option> : null}
        </select>

        {/* Chevron */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-cyan text-xl">
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
              "bg-stage/70 border-2 border-cyan",
              "text-foreground text-base",
              "placeholder:text-foreground/30",
              "focus:outline-none focus:bg-stage focus:shadow-cyan-glow-sm",
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
            className="px-4 h-12 rounded-xl bg-cyan text-stage font-bold"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomMode(false);
              setCustomValue("");
            }}
            className="px-3 h-12 rounded-xl bg-stage/60 text-foreground/70 border border-border"
          >
            X
          </button>
        </div>
      ) : null}

      {/* Selected preview card — modern style with gradient border */}
      {selected ? (
        <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-stage/60 border border-cyan/40 shadow-cyan-glow-sm">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center font-display text-xl text-stage shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${selected.color}, ${selected.color}dd)`,
              boxShadow: `0 0 20px ${selected.color}55`,
            }}
          >
            {selected.letter}
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-cream/50 uppercase tracking-[0.18em]">
              Playing as
            </div>
            <div className="text-lg font-bold text-foreground">
              {selected.emoji} {selected.firstName} {selected.lastName}
            </div>
          </div>
          <div className="text-xl opacity-70">{selected.emoji}</div>
        </div>
      ) : null}
    </div>
  );
}