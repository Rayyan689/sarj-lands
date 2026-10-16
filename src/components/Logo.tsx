import { ARABIC_D, LATIN_D, VB_MARK, VB_STACKED } from "./logo-paths";

/** The Sarj Real Estate logo. Inherits text color, so it works on light and dark backgrounds. */
export default function Logo({ variant = "stacked", className = "", title = "سرج العقارية | Sarj Real Estate" }: { variant?: "stacked" | "mark"; className?: string; title?: string }) {
  return (
    <svg viewBox={variant === "mark" ? VB_MARK : VB_STACKED} className={className} role="img" aria-label={title} fill="currentColor">
      <title>{title}</title>
      <path d={ARABIC_D} />
      {variant === "stacked" && <path d={LATIN_D} />}
    </svg>
  );
}
