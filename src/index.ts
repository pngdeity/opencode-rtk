// RTK OpenCode plugin — rewrites commands to use rtk for token savings.
// Requires: rtk >= 0.51.0 in PATH (the four-code `rtk rewrite` contract below).
//
// This is a thin delegating plugin: all rewrite logic lives in `rtk rewrite`,
// which is the single source of truth (src/discover/registry.rs).
// To add or change rewrite rules, edit the Rust registry — not this file.
//
// Env: RTK_DISABLE=1 disables rewriting for the session (note: rtk documents
// RTK_DISABLED=1 for per-command bypass; this is a distinct session-wide gate).
//
// `rtk rewrite` renders a four-code contract (src/hooks/rewrite_cmd.rs, which
// agrees with `--help` since 0.51.0): 0 = rewrite, allow rules cover it (stdout
// is the command); 3 = rewrite, ask rule or allow rules short of every command
// (stdout is the command); 1 = no rewrite / a deny inside a shell wrapper's
// script (no stdout); 2 = a deny rule matched (no stdout). The gate keys on
// stdout, not on a literal code: any output that differs from the input is a
// rewrite, and no output means pass the command through unchanged.

const DEFAULT_REWRITE_TIMEOUT_MS = 2000;

export function extractShellCommand(event: any): {
  input: Record<string, unknown>;
  command: string;
} | null {
  const tool = String(event?.tool ?? "").toLowerCase();
  if (tool !== "bash" && tool !== "shell") return null;
  const input = event?.input;
  if (!input || typeof input !== "object") return null;
  const command = (input as Record<string, unknown>).command;
  if (typeof command !== "string" || !command) return null;
  return { input: input as Record<string, unknown>, command };
}

export function applyRewriteOutput(
  input: Record<string, unknown>,
  original: string,
  stdout: string,
): boolean {
  const rewritten = stdout.trim();
  if (!rewritten || rewritten === original) return false;
  input.command = rewritten;
  return true;
}

export default {
  id: "rtk",
  setup: async (ctx: any) => {
    if (process.env.RTK_DISABLE === "1" || ctx?.options?.disabled === true) return;

    const rtk = Bun.which("rtk");
    if (!rtk) {
      console.warn("[rtk] rtk binary not found in PATH — plugin disabled");
      return;
    }

    const timeoutMs =
      typeof ctx?.options?.timeoutMs === "number" && ctx.options.timeoutMs > 0
        ? ctx.options.timeoutMs
        : DEFAULT_REWRITE_TIMEOUT_MS;

    const registration = await ctx.tool.hook("execute.before", async (event: any) => {
      const target = extractShellCommand(event);
      if (!target) return;

      try {
        const proc = Bun.spawn([rtk, "rewrite", target.command], {
          stdout: "pipe",
          stderr: "pipe",
          signal: AbortSignal.timeout(timeoutMs),
        });
        const text = await new Response(proc.stdout).text();
        await proc.exited;
        // Key on stdout, not a literal exit code: 0 and 3 both print a rewrite,
        // 1 and 2 print nothing (no rewrite / deny). See the header.
        applyRewriteOutput(target.input, target.command, text);
      } catch {
        // rtk rewrite failed or timed out — pass through unchanged
      }
    });

    return () => registration?.dispose?.();
  },
};
