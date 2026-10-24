import { describe, expect, test } from "bun:test";
import { EMPTY_GAIN, isCoherent, parseGain, savingsPct } from "../src/gain";

const SAMPLE = JSON.stringify({
  summary: {
    total_commands: 35703,
    total_input: 7116612,
    total_output: 3865026,
    total_saved: 3260162,
    avg_savings_pct: 45.81,
    total_time_ms: 9889023,
    avg_time_ms: 277,
    oversized_excluded: 363,
  },
  daily: [
    {
      date: "2026-10-23",
      commands: 681,
      input_tokens: 142110,
      output_tokens: 81220,
      saved_tokens: 60890,
      savings_pct: 42.85,
      total_time_ms: 190113,
      avg_time_ms: 279,
    },
    {
      date: "2026-10-24",
      commands: 716,
      input_tokens: 154937,
      output_tokens: 89666,
      saved_tokens: 65271,
      savings_pct: 42.13,
      total_time_ms: 199184,
      avg_time_ms: 278,
    },
  ],
});

describe("parseGain", () => {
  test("reads the summary and the daily series", () => {
    const parsed = parseGain(SAMPLE);
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;
    expect(parsed.gain.total.commands).toBe(35703);
    expect(parsed.gain.total.input).toBe(7116612);
    expect(parsed.gain.total.saved).toBe(3260162);
    expect(parsed.gain.total.totalMs).toBe(9889023);
    expect(parsed.gain.oversizedExcluded).toBe(363);
    expect(parsed.gain.daily.map((day) => day.date)).toEqual(["2026-10-23", "2026-10-24"]);
    expect(parsed.gain.daily[1]?.saved).toBe(65271);
  });

  test("accepts a summary without a daily series", () => {
    const parsed = parseGain(
      JSON.stringify({
        summary: { total_commands: 3, total_input: 100, total_output: 40, total_saved: 60 },
      }),
    );
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;
    expect(parsed.gain.daily).toEqual([]);
  });

  test("reports a failure with rtk's own first line, never a zero", () => {
    const parsed = parseGain("error: could not open history database\n");
    expect(parsed).toEqual({ kind: "failed", detail: "error: could not open history database" });
  });

  test("rejects JSON that is not a gain report", () => {
    const parsed = parseGain('{"other":true}');
    expect(parsed.kind).toBe("failed");
  });

  test("skips daily rows without a date and coerces junk counts to zero", () => {
    const parsed = parseGain(
      JSON.stringify({
        summary: { total_commands: 1, total_input: 10, total_output: 5, total_saved: 5 },
        daily: [{ commands: 1 }, { date: "2026-10-24", commands: "many", input_tokens: 10 }],
      }),
    );
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;
    expect(parsed.gain.daily).toHaveLength(1);
    expect(parsed.gain.daily[0]?.commands).toBe(0);
    expect(parsed.gain.daily[0]?.input).toBe(10);
  });
});

describe("savingsPct", () => {
  test("derives the rate from the counts instead of trusting savings_pct", () => {
    expect(
      savingsPct({ commands: 10, input: 1_000_000, output: 500_000, saved: 500_000, totalMs: 0 }),
    ).toBe(50);
    expect(savingsPct({ commands: 3, input: 3, output: 2, saved: 1, totalMs: 0 })).toBe(33.3);
  });

  test("is null over an empty sample", () => {
    expect(savingsPct(EMPTY_GAIN.total)).toBeNull();
    expect(savingsPct({ commands: 0, input: 0, output: 0, saved: 0, totalMs: 0 })).toBeNull();
  });
});

describe("isCoherent", () => {
  test("holds when saved equals input minus output", () => {
    expect(isCoherent({ commands: 1, input: 100, output: 40, saved: 60, totalMs: 0 })).toBe(true);
    expect(isCoherent({ commands: 1, input: 100, output: 40, saved: 99, totalMs: 0 })).toBe(false);
  });
});
