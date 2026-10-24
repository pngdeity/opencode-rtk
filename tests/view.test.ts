import { describe, expect, test } from "bun:test";
import type { Gain, SparkDay } from "../src/gain";
import { EMPTY_GAIN } from "../src/gain";
import {
  BAR_CELLS,
  detailRows,
  footerText,
  formatAge,
  formatTokens,
  freshness,
  FRESH_MS,
  parseSurfaces,
  type Reading,
  savingsBar,
  scopeLabel,
  SPARK_DAYS,
  sparkline,
  totalsRows,
} from "../src/view";

function gainOf(total: Partial<Gain["total"]>, daily: SparkDay[] = []): Gain {
  return {
    total: { commands: 0, input: 0, output: 0, saved: 0, totalMs: 0, ...total },
    daily: daily.map((day) => ({ ...day, commands: 1, input: 10, output: 5, totalMs: 0 })),
    oversizedExcluded: 0,
  };
}

function readingOf(gain: Gain, at = 0): Reading {
  return { scope: "session", at, gain };
}

describe("formatTokens", () => {
  test("scales to one decimal above a thousand", () => {
    expect(formatTokens(999)).toBe("999");
    expect(formatTokens(1_500)).toBe("1.5K");
    expect(formatTokens(3_260_162)).toBe("3.3M");
    expect(formatTokens(2_500_000_000)).toBe("2.5B");
  });

  test("a negative or non-finite count is unknown, not zero", () => {
    expect(formatTokens(Number.NaN)).toBe("?");
    expect(formatTokens(-1)).toBe("?");
  });
});

describe("freshness", () => {
  test("an age past the fresh window is stale", () => {
    const reading = readingOf(EMPTY_GAIN, 1_000);
    expect(freshness(reading, 1_000 + FRESH_MS).stale).toBe(false);
    expect(freshness(reading, 1_000 + FRESH_MS + 1).stale).toBe(true);
  });

  test("a clock that moved backwards is zero age, not negative", () => {
    const reading = readingOf(EMPTY_GAIN, 5_000);
    expect(freshness(reading, 1_000).ageMs).toBe(0);
  });

  test("ages read in the largest unit that still says something", () => {
    expect(formatAge(9_000)).toBe("9s");
    expect(formatAge(90_000)).toBe("1m");
    expect(formatAge(7_200_000)).toBe("2h");
    expect(formatAge(172_800_000)).toBe("2d");
  });
});

describe("footerText", () => {
  test("states the scope, the saved count, the rate, and the sample size", () => {
    const text = footerText(
      readingOf(gainOf({ commands: 716, input: 154937, output: 89666, saved: 65271 }), 0),
      0,
    );
    expect(text).toBe("rtk project · 65.3K saved  42.1% ·   716 cmds");
  });

  test("over an empty history says so instead of printing 0%", () => {
    expect(footerText(readingOf(EMPTY_GAIN, 0), 0)).toBe("rtk project · no rewrites yet");
  });

  test("marks a stale reading with its age", () => {
    const text = footerText(
      readingOf(gainOf({ commands: 10, input: 1000, output: 500, saved: 500 }), 0),
      90_000,
    );
    expect(text).toContain("stale 1m");
  });

  test("names the global scope, never the session's", () => {
    const reading: Reading = { ...readingOf(EMPTY_GAIN), scope: "global" };
    expect(footerText(reading, 0)).toContain("rtk all");
  });
});

describe("savingsBar", () => {
  test("fills according to the rate and keeps a constant width", () => {
    expect(savingsBar(0)).toBe("░".repeat(BAR_CELLS));
    expect(savingsBar(100)).toBe("▓".repeat(BAR_CELLS));
    expect(savingsBar(50)).toHaveLength(BAR_CELLS);
    expect(savingsBar(50)).toBe(`${"▓".repeat(10)}${"░".repeat(10)}`);
  });

  test("no rate draws no bar", () => {
    expect(savingsBar(null)).toBe("");
  });
});

describe("sparkline", () => {
  test("needs two days before it draws a series", () => {
    expect(sparkline([]).kind).toBe("insufficient");
    expect(sparkline([{ date: "2026-10-23", saved: 5 }]).kind).toBe("insufficient");
  });

  test("an empty day keeps its slot as the lowest glyph", () => {
    const result = sparkline([
      { date: "2026-10-23", saved: 100 },
      { date: "2026-10-24", saved: 0 },
    ]);
    expect(result).toEqual({ kind: "ok", cells: "█▁" });
  });

  test("windows to the most recent days", () => {
    const days: SparkDay[] = Array.from({ length: 40 }, (_, index) => ({
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      saved: index + 1,
    }));
    const result = sparkline(days);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.cells).toHaveLength(SPARK_DAYS);
  });
});

describe("totalsRows", () => {
  test("pads values to one column width", () => {
    const rows = totalsRows({
      commands: 716,
      input: 154937,
      output: 89666,
      saved: 65271,
      totalMs: 0,
    });
    expect(rows.map((row) => row.label)).toEqual(["commands", "input", "output", "saved", "rate"]);
    const widths = new Set(rows.map((row) => row.width));
    expect(widths.size).toBe(1);
    expect(rows[4]?.value).toBe("42.1%");
  });

  test("an empty history shows dashes, not zeros dressed as a rate", () => {
    const rows = totalsRows(EMPTY_GAIN.total);
    expect(rows[3]?.value).toBe("—");
    expect(rows[4]?.value).toBe("—");
  });
});

describe("detailRows", () => {
  test("names the denominator beside the saved figure", () => {
    const rows = detailRows(
      readingOf(gainOf({ commands: 100, input: 1_000_000, output: 400_000, saved: 600_000 })),
    );
    expect(rows).toEqual([
      { label: "saved", value: "600.0K" },
      { label: "of input", value: "1.0M" },
      { label: "measured", value: "100 cmds" },
    ]);
  });

  test("counts excluded commands out loud and flags incoherent counts", () => {
    const gain = gainOf({ commands: 10, input: 100, output: 10, saved: 5 });
    const rows = detailRows(readingOf({ ...gain, oversizedExcluded: 7 }));
    expect(rows).toContainEqual({ label: "excluded", value: "7 oversized" });
    expect(rows).toContainEqual({ label: "warning", value: "counts do not reconcile" });
  });
});

describe("parseSurfaces", () => {
  test("registering nothing is the default", () => {
    expect(parseSurfaces(undefined).size).toBe(0);
    expect(parseSurfaces([]).size).toBe(0);
    expect(parseSurfaces("").size).toBe(0);
  });

  test("accepts a list or a comma string and ignores unknown names", () => {
    expect([...parseSurfaces(["footer"])]).toEqual(["footer"]);
    expect([...parseSurfaces("sidebar, pane")].sort()).toEqual(["pane", "sidebar"]);
    expect(parseSurfaces(["hud", "footer"]).size).toBe(1);
  });

  test("all expands to every surface", () => {
    expect([...parseSurfaces(["all"])].sort()).toEqual(["footer", "pane", "sidebar"]);
  });
});

describe("scopeLabel", () => {
  test("project and all, never an unlabelled figure", () => {
    expect(scopeLabel("session")).toBe("project");
    expect(scopeLabel("global")).toBe("all");
  });
});
