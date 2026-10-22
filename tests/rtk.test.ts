import { afterEach, describe, expect, test } from "bun:test";
import plugin, { applyRewriteOutput, extractShellCommand } from "../src/index";

const originalDisable = process.env.RTK_DISABLE;

afterEach(() => {
  if (originalDisable === undefined) delete process.env.RTK_DISABLE;
  else process.env.RTK_DISABLE = originalDisable;
});

describe("extractShellCommand", () => {
  test("accepts bash and shell tools with a non-empty command string", () => {
    const input = { command: "git status" };
    expect(extractShellCommand({ tool: "bash", input })).toEqual({
      input,
      command: "git status",
    });
    expect(extractShellCommand({ tool: "SHELL", input })).toEqual({
      input,
      command: "git status",
    });
  });

  test("ignores non-shell tools or missing command", () => {
    expect(extractShellCommand({ tool: "read", input: { command: "ls" } })).toBeNull();
    expect(extractShellCommand({ tool: "bash", input: { command: "" } })).toBeNull();
    expect(extractShellCommand({ tool: "bash", input: null })).toBeNull();
  });
});

describe("applyRewriteOutput", () => {
  test("mutates input.command when stdout differs from original", () => {
    const input: Record<string, unknown> = { command: "git status" };
    expect(applyRewriteOutput(input, "git status", "rtk git status\n")).toBe(true);
    expect(input.command).toBe("rtk git status");
  });

  test("leaves input.command unchanged when stdout is empty or identical", () => {
    const input: Record<string, unknown> = { command: "git status" };
    expect(applyRewriteOutput(input, "git status", "  \n")).toBe(false);
    expect(applyRewriteOutput(input, "git status", "git status\n")).toBe(false);
    expect(input.command).toBe("git status");
  });
});

describe("setup gate", () => {
  test("RTK_DISABLE=1 skips hook registration", async () => {
    process.env.RTK_DISABLE = "1";
    let hooked = 0;
    await plugin.setup({
      tool: {
        hook: async () => {
          hooked += 1;
          return { dispose: () => {} };
        },
      },
    });
    expect(hooked).toBe(0);
  });

  test("options.disabled=true skips hook registration", async () => {
    let hooked = 0;
    await plugin.setup({
      options: { disabled: true },
      tool: {
        hook: async () => {
          hooked += 1;
          return { dispose: () => {} };
        },
      },
    });
    expect(hooked).toBe(0);
  });
});
