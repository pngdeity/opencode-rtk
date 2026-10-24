// theme — semantic theme roles, resolved without inventing colours.
//
// A missing token renders as "inherit", never as a hardcoded hex: a plugin that
// paints its own palette is the one thing a themed host cannot correct.
//
// Structural, not nominal: it accepts the shadow of the context theme instead of
// importing `@opencode/theme`, which is a peer of the host and not of a plugin.
// A token is an OpenTUI `RGBA` instance, the colour every attribute accepts —
// type-only, so nothing here reaches the renderer at runtime.

import type { RGBA } from "@opentui/core";

export type Color = string | RGBA;

export type ThemeTokens = {
  text?: {
    base?: Color;
    muted?: Color;
    subtle?: Color;
    feedback?: {
      success?: { base?: Color };
      warning?: { base?: Color };
      error?: { base?: Color };
      info?: { base?: Color };
    };
  };
};

export type Role = "text" | "muted" | "subtle" | "ok" | "warn" | "bad" | "info";

export function roleColor(theme: ThemeTokens | undefined, role: Role): Color | undefined {
  const text = theme?.text;
  switch (role) {
    case "text":
      return text?.base;
    case "muted":
      return text?.muted;
    case "subtle":
      return text?.subtle;
    case "ok":
      return text?.feedback?.success?.base;
    case "warn":
      return text?.feedback?.warning?.base;
    case "bad":
      return text?.feedback?.error?.base;
    case "info":
      return text?.feedback?.info?.base;
  }
}

// A saving rate is good news only once it is real; below a tenth it is noise and
// is shown muted rather than celebrated.
export function rateRole(pct: number | null): Role {
  if (pct === null) return "muted";
  if (pct >= 30) return "ok";
  if (pct >= 10) return "text";
  return "muted";
}
