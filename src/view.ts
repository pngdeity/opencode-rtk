// view — every rendered figure, decided without a renderer.
//
// The TUI half is an imperative shell: it spawns `rtk`, holds the reading, and
// paints. What a figure says — its scope, its staleness, its width, whether it
// is a ratio at all — is decided here so it can be asserted in a test rather
// than inspected in a terminal.
//
// Pure: no Solid, no node builtins, no I/O.

import { type Bucket, type Gain, isCoherent, savingsPct } from "./gain";

export type Scope = "session" | "global";

export type Surface = "sidebar" | "footer" | "pane";

export type Reading = {
  scope: Scope;
  at: number;
  gain: Gain;
};

export type ReadResult =
  | { kind: "ok"; reading: Reading }
  | { kind: "failed"; detail: string }
  | { kind: "unavailable"; detail: string };

export type Freshness = { stale: boolean; ageMs: number };

export const FRESH_MS = 60_000;

export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "?";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function scopeLabel(scope: Scope): string {
  return scope === "session" ? "project" : "all";
}

export function freshness(reading: Reading, now: number): Freshness {
  const ageMs = Math.max(0, now - reading.at);
  return { stale: ageMs > FRESH_MS, ageMs };
}

export function formatAge(ageMs: number): string {
  const s = Math.floor(ageMs / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// One line, fixed field widths: a footer that changes width reflows its
// neighbours on every poll because a count crossed a digit boundary.
export function footerText(reading: Reading, now: number): string {
  const { stale, ageMs } = freshness(reading, now);
  const scope = scopeLabel(reading.scope);
  const { total } = reading.gain;
  const pct = savingsPct(total);
  if (pct === null) return `rtk ${scope} · no rewrites yet`;
  const saved = formatTokens(total.saved).padStart(5);
  const ratio = `${pct.toFixed(1)}%`.padStart(6);
  const commands = formatTokens(total.commands).padStart(5);
  const tail = stale ? ` · stale ${formatAge(ageMs)}` : "";
  return `rtk ${scope} · ${saved} saved ${ratio} · ${commands} cmds${tail}`;
}

// Twenty cells. The bar is a shape, not a measurement: the percentage printed
// beside it is the measurement, and it is derived from the same integers the
// reader can also see as counts.
export const BAR_CELLS = 20;

export function savingsBar(pct: number | null): string {
  if (pct === null) return "";
  const filled = Math.max(0, Math.min(BAR_CELLS, Math.round((pct / 100) * BAR_CELLS)));
  return "▓".repeat(filled) + "░".repeat(BAR_CELLS - filled);
}

export type SparklineResult = { kind: "ok"; cells: string } | { kind: "insufficient" };

export type SparkDay = { date: string; saved: number };

// Eight glyphs over the last N days. An empty day keeps its slot as the lowest
// glyph so a gap in the series stays a visible gap rather than closing up and
// implying continuity that did not happen.
const SPARK_GLYPHS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

export const SPARK_DAYS = 14;

export function sparkline(days: SparkDay[], window = SPARK_DAYS): SparklineResult {
  if (days.length < 2) return { kind: "insufficient" };
  const slice = days.slice(-window);
  const peak = slice.reduce((max, day) => Math.max(max, day.saved), 0);
  const cells = slice
    .map((day) => {
      if (day.saved <= 0 || peak <= 0) return SPARK_GLYPHS[0];
      const level = Math.ceil((day.saved / peak) * (SPARK_GLYPHS.length - 1));
      return SPARK_GLYPHS[Math.min(SPARK_GLYPHS.length - 1, Math.max(0, level))];
    })
    .join("");
  return { kind: "ok", cells };
}

export type TotalsRow = { label: string; value: string; width: number };

// Right-aligned values, so the units line up down the column regardless of
// whether a row holds "4.1M" or "981".
export function totalsRows(bucket: Bucket): TotalsRow[] {
  const pct = savingsPct(bucket);
  const cells: { label: string; value: string }[] = [
    { label: "commands", value: formatTokens(bucket.commands) },
    { label: "input", value: formatTokens(bucket.input) },
    { label: "output", value: formatTokens(bucket.output) },
    { label: "saved", value: pct === null ? "—" : formatTokens(bucket.saved) },
    { label: "rate", value: pct === null ? "—" : `${pct.toFixed(1)}%` },
  ];
  const width = cells.reduce((max, cell) => Math.max(max, cell.value.length), 0);
  return cells.map((cell) => ({ ...cell, width }));
}

export type DetailRow = { label: string; value: string };
// The sample is a claim, so its defects are stated where the figures are: a
// bucket whose counts disagree is named, and excluded commands are counted out
// loud rather than folded silently into the totals.
export function detailRows(reading: Reading): DetailRow[] {
  const rows: DetailRow[] = [];
  const total = reading.gain.total;
  const pct = savingsPct(total);
  rows.push({ label: "saved", value: pct === null ? "—" : formatTokens(total.saved) });
  rows.push({ label: "of input", value: pct === null ? "—" : formatTokens(total.input) });
  rows.push({
    label: "measured",
    value: total.commands === 0 ? "—" : `${formatTokens(total.commands)} cmds`,
  });
  if (total.totalMs > 0) {
    const avg = Math.round(total.totalMs / Math.max(1, total.commands));
    rows.push({ label: "rtk cost", value: `${avg} ms/cmd` });
  }
  if (reading.gain.oversizedExcluded > 0) {
    rows.push({
      label: "excluded",
      value: `${formatTokens(reading.gain.oversizedExcluded)} oversized`,
    });
  }
  if (!isCoherent(total)) rows.push({ label: "warning", value: "counts do not reconcile" });
  return rows;
}

export function parseSurfaces(value: unknown): Set<Surface> {
  const wanted = new Set<Surface>();
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  for (const entry of list) {
    if (typeof entry !== "string") continue;
    const name = entry.trim().toLowerCase();
    if (name === "sidebar" || name === "footer" || name === "pane") wanted.add(name);
    else if (name === "all") {
      wanted.add("sidebar");
      wanted.add("footer");
      wanted.add("pane");
    }
  }
  return wanted;
}

export const PANEL_NAME = "rtk.gain";

// Re-exported so a view consumer derives its rate from the same function the
// rows use; two derivations would be two chances to disagree.
export { savingsPct } from "./gain";
