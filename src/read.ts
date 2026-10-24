// read — the only module here that runs a process.
//
// One spawn per reading: `rtk gain -p -d -f json` for the project scope, or the
// same without `-p` for the global scope. `rtk gain --watch` is never spawned;
// it takes over the terminal, and a widget that starts a full-screen dashboard
// inside someone else's TUI has replaced their screen rather than reported on it.
//
// A command that ran and had nothing to say is `ok` with an empty history. A
// missing binary is `unavailable` and a failing one is `failed`, each carrying
// rtk's own first line — never a synthesized zero, because "0 saved" and "I
// could not ask" are different facts and only one of them is honest.
//
// Imports `node:*` only, which keeps it a legal sibling of the TUI entrypoint
// (see tui.tsx header). The parse is delegated to the pure module.

import { spawn } from "node:child_process";
import { EMPTY_GAIN, parseGain } from "./gain";
import type { ReadResult, Scope } from "./view";

export const READ_TIMEOUT_MS = 2500;

function firstLine(text: string): string {
  return text.trim().split("\n")[0]?.trim().slice(0, 200) ?? "";
}

export async function readGain(
  rtk: string,
  scope: Scope,
  cwd: string | undefined,
): Promise<ReadResult> {
  const args = ["gain", "-d", "-f", "json"];
  if (scope === "session") args.splice(1, 0, "-p");

  return new Promise<ReadResult>((resolve) => {
    let settled = false;
    const finish = (result: ReadResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(rtk, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: READ_TIMEOUT_MS,
      });
    } catch (error) {
      finish({ kind: "unavailable", detail: firstLine(String(error)) });
      return;
    }

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ kind: "failed", detail: `rtk gain timed out after ${READ_TIMEOUT_MS} ms` });
    }, READ_TIMEOUT_MS);

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        finish({ kind: "unavailable", detail: "rtk not found in PATH" });
        return;
      }
      finish({ kind: "failed", detail: firstLine(error.message) });
    });

    child.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        finish({ kind: "failed", detail: firstLine(stderr) || `rtk gain exited ${code}` });
        return;
      }
      if (!stdout.trim()) {
        finish({ kind: "ok", reading: { scope, at: Date.now(), gain: EMPTY_GAIN } });
        return;
      }
      const parsed = parseGain(stdout);
      if (parsed.kind === "ok") {
        finish({ kind: "ok", reading: { scope, at: Date.now(), gain: parsed.gain } });
        return;
      }
      finish({ kind: "failed", detail: parsed.detail });
    });
  });
}
