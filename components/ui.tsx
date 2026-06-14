import type { ComponentProps } from "react";

/** Shared form/UI primitives in the Happily theme — used across every screen. */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`rounded-md border border-line bg-base px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Select(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`rounded-md border border-line bg-base px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Button({
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-accent text-accent-fg hover:bg-accent-strong",
    ghost: "border border-line text-ink hover:bg-elevated",
    danger: "border border-down/40 text-down hover:bg-down/10",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${styles} ${props.className ?? ""}`}
    />
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-line bg-surface p-5 ${className ?? ""}`}>{children}</div>
  );
}
