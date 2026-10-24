// gain — the `rtk gain` reporting contract, stated once.
//
// `rtk gain -f json` prints one object: `{ summary, daily? }`. The summary is
// cumulative and always present; `daily` appears only with `-d`. Every field is
// an integer count except the two ratios and the two millisecond averages, and
// `avg_savings_pct` is exactly `total_saved / total_input` — so a percentage is
// always recomputed from the counts rather than trusted, and a ratio is never
// rendered unless the counts it came from are rendered beside it.
//
// `saved = input - output` holds per bucket (rtk subtracts the rewrite's output
// from the original command's input). Parse does not assume it: a bucket whose
// counts disagree is reported as internally inconsistent, because a wrong
// integer must not be silently averaged into a plausible percentage.
//
// Pure: no Solid, no node builtins, no I/O. A legal sibling module of the TUI
// entrypoint (see tui.tsx header) and directly unit-testable.

export type Bucket = {
  commands: number;
  input: number;
  output: number;
  saved: number;
  totalMs: number;
};

export type SparkDay = { date: string; saved: number };

export type Day = Bucket & { date: string };

export type Gain = {
  total: Bucket;
  daily: Day[];
  oversizedExcluded: number;
};

export type ParsedGain = { kind: "ok"; gain: Gain } | { kind: "failed"; detail: string };

// rtk writes an empty history as a summary of zeros. That is a real reading —
// rtk ran and had nothing to report — and is distinguished from a failure so no
// caller invents a 0% saving over a sample of nothing.
export const EMPTY_GAIN: Gain = {
  total: { commands: 0, input: 0, output: 0, saved: 0, totalMs: 0 },
  daily: [],
  oversizedExcluded: 0,
};

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function int(value: unknown): number {
  return isCount(value) ? Math.trunc(value) : 0;
}

function bucketFrom(
  raw: Record<string, unknown>,
  tokens: { input: string; output: string; saved: string },
): Bucket {
  return {
    commands: int(raw.total_commands ?? raw.commands),
    input: int(raw[tokens.input]),
    output: int(raw[tokens.output]),
    saved: int(raw[tokens.saved]),
    totalMs: int(raw.total_time_ms),
  };
}

export function parseGain(text: string): ParsedGain {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    const first = text.trim().split("\n")[0]?.trim();
    return { kind: "failed", detail: first ? first.slice(0, 200) : "no output" };
  }
  if (!raw || typeof raw !== "object") {
    return { kind: "failed", detail: "unexpected JSON shape" };
  }

  const root = raw as Record<string, unknown>;
  const summary = root.summary;
  if (!summary || typeof summary !== "object") {
    return { kind: "failed", detail: "no summary in JSON" };
  }

  const total = bucketFrom(summary as Record<string, unknown>, {
    input: "total_input",
    output: "total_output",
    saved: "total_saved",
  });

  const daily: Day[] = [];
  if (Array.isArray(root.daily)) {
    for (const row of root.daily) {
      if (!row || typeof row !== "object") continue;
      const entry = row as Record<string, unknown>;
      const date = typeof entry.date === "string" ? entry.date : "";
      if (!date) continue;
      const bucket = bucketFrom(entry, {
        input: "input_tokens",
        output: "output_tokens",
        saved: "saved_tokens",
      });
      daily.push({ date, ...bucket });
    }
  }

  return {
    kind: "ok",
    gain: {
      total,
      daily,
      oversizedExcluded: int((summary as Record<string, unknown>).oversized_excluded),
    },
  };
}

export function isCoherent(bucket: Bucket): boolean {
  return bucket.saved === bucket.input - bucket.output;
}

// Recompute rather than read `savings_pct`: one derivation, so a percentage can
// never disagree with the counts shown next to it. Null over an empty sample —
// there is no saving rate for zero commands.
export function savingsPct(bucket: Bucket): number | null {
  if (bucket.commands === 0 || bucket.input <= 0) return null;
  return Math.round((bucket.saved / bucket.input) * 1000) / 10;
}
