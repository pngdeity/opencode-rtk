/** @jsxImportSource @opentui/solid */
// RTK TUI half — registers the savings surfaces, then gets out of the way.
//
// Every figure this file paints was decided by the pure modules (`gain.ts`,
// `view.ts`, `theme.ts`); this file owns only effects: one poll, one signal, and
// the slot and keymap registrations.
//
// Loader constraint: OpenCode resolves each file's imports independently and
// only the ENTRY file's bare imports are resolvable. Everything imported here is
// either a bare specifier (resolved by the host) or a sibling importing nothing
// but its own pure peers or `node:*`. Importing `solid-js` from a sibling fails
// with "Cannot find package 'solid-js' imported from …".
//
// Surfaces are opt-in and passed as plugin options, per the documented CLI
// plugin contract:
//
//   { "package": "@pngdeity/opencode-rtk", "options": { "surfaces": ["footer"] } }
//
// Field `surfaces`: sidebar | footer | pane | all. Unset registers nothing.
// Field `scopes`: `session` (this project's rewrites, rtk `-p`) or `global`
// (every rewrite on this machine). The default is `session`, because a
// machine-wide counter attributed to one session is not a fact about it.

import type { Context, PanelInput } from "@opencode/plugin/tui";
import { Plugin, usePlugin } from "@opencode/plugin/tui";
import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { readGain } from "./src/read";
import type { Role, ThemeTokens } from "./src/theme";
import { rateRole, roleColor } from "./src/theme";
import {
  detailRows,
  footerText,
  formatAge,
  freshness,
  PANEL_NAME,
  parseSurfaces,
  type ReadResult,
  SPARK_DAYS,
  savingsBar,
  savingsPct,
  type Scope,
  scopeLabel,
  sparkline,
  totalsRows,
} from "./src/view";

const POLL_MS = 30_000;
const WARM_MS = 4_000;

type Options = { surfaces?: unknown; scopes?: unknown; disabled?: boolean };

function resolveScopes(value: unknown): Scope[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const scopes: Scope[] = [];
  for (const entry of list) {
    if (typeof entry !== "string") continue;
    const name = entry.trim().toLowerCase();
    if ((name === "session" || name === "project") && !scopes.includes("session")) {
      scopes.push("session");
    } else if ((name === "global" || name === "all") && !scopes.includes("global")) {
      scopes.push("global");
    }
  }
  return scopes.length > 0 ? scopes : ["session"];
}

export default Plugin.define({
  id: "rtk",
  setup: async (ctx: Context) => {
    const options = (ctx.options ?? {}) as Options;
    if (options.disabled === true) return;

    const surfaces = parseSurfaces(options.surfaces);
    if (surfaces.size === 0) return;

    const rtk = Bun.which("rtk");
    const cwd = ctx.location?.directory;
    if (!rtk || !cwd) return;

    const scopes = resolveScopes(options.scopes);
    const [results, setResults] = createSignal<Partial<Record<Scope, ReadResult>>>({});
    const [now, setNow] = createSignal(Date.now());

    let inFlight = false;
    let stopped = false;

    const refresh = async () => {
      if (inFlight || stopped) return;
      inFlight = true;
      try {
        const readings = await Promise.all(scopes.map((scope) => readGain(rtk, scope, cwd)));
        if (stopped) return;
        const next: Partial<Record<Scope, ReadResult>> = {};
        scopes.forEach((scope, index) => {
          next[scope] = readings[index];
        });
        setResults(next);
        setNow(Date.now());
      } finally {
        inFlight = false;
      }
    };

    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = () => {
      if (stopped) return;
      setNow(Date.now());
      void refresh();
    };

    void refresh();
    for (const delay of [WARM_MS, 12_000, 24_000]) {
      timers.push(setTimeout(tick, delay));
    }
    const interval = setInterval(tick, POLL_MS);

    const tone = (t: ThemeTokens, role: Role) => roleColor(t, role);

    const reading = (scope: Scope) => {
      const result = results()[scope];
      return result?.kind === "ok" ? result.reading : undefined;
    };

    const failure = (scope: Scope) => {
      const result = results()[scope];
      return result && result.kind !== "ok" ? result.detail : "";
    };

    const rows = (scope: Scope) => {
      const value = reading(scope);
      return value ? totalsRows(value.gain.total) : [];
    };

    const bar = (scope: Scope) => {
      const value = reading(scope);
      return value ? savingsBar(savingsPct(value.gain.total)) : "";
    };

    const details = (scope: Scope) => {
      const value = reading(scope);
      return value ? detailRows(value) : [];
    };

    const age = (scope: Scope) => {
      const value = reading(scope);
      return value ? formatAge(now() - value.at) : "—";
    };

    const useSecond = () => {
      onMount(() => {
        const second = setInterval(() => {
          if (!stopped) setNow(Date.now());
        }, 1000);
        onCleanup(() => clearInterval(second));
      });
    };

    const footerLabel = (scope: Scope) => {
      const current = reading(scope);
      if (current) return footerText(current, now());
      const problem = failure(scope);
      return problem
        ? `rtk ${scopeLabel(scope)} · ${problem}`
        : `rtk ${scopeLabel(scope)} · reading…`;
    };

    const footerRole = (scope: Scope): Role => {
      if (failure(scope)) return "bad";
      const current = reading(scope);
      if (!current || freshness(current, now()).stale) return "muted";
      return rateRole(savingsPct(current.gain.total));
    };

    if (surfaces.has("footer")) {
      ctx.ui.slot({
        append: "prompt.footer.status",
        render: () => {
          useSecond();
          return (
            <text>
              {scopes.map((scope) => (
                <span style={{ fg: tone(ctx.theme, footerRole(scope)) }}>{footerLabel(scope)}</span>
              ))}
            </text>
          );
        },
      });
    }

    if (surfaces.has("sidebar")) {
      ctx.ui.slot({
        append: "sidebar.content",
        render: () => {
          useSecond();
          return (
            <box flexDirection="column" minWidth={0}>
              {scopes.map((scope) => (
                <box flexDirection="column" minWidth={0}>
                  <text fg={tone(ctx.theme, "muted")}>
                    {reading(scope)
                      ? `rtk ${scopeLabel(scope)} · ${age(scope)} ago`
                      : `rtk ${scopeLabel(scope)} · reading…`}
                  </text>
                  <Show when={failure(scope)}>
                    <text fg={tone(ctx.theme, "bad")}>{failure(scope)}</text>
                  </Show>
                  {rows(scope).map((row) => (
                    <text>
                      <span style={{ fg: tone(ctx.theme, "muted") }}>{row.label.padEnd(9)}</span>
                      <span style={{ fg: tone(ctx.theme, "text") }}>
                        {row.value.padStart(row.width)}
                      </span>
                    </text>
                  ))}
                  <Show when={bar(scope)}>
                    <text fg={tone(ctx.theme, "text")}>{bar(scope)}</text>
                  </Show>
                </box>
              ))}
            </box>
          );
        },
      });
    }

    function GainPanel(props: { panel: PanelInput }) {
      const panelContext = usePlugin();
      const panelTone = (role: Role) => tone(panelContext.theme, role);

      onMount(() => {
        void refresh();
      });

      const spark = () => {
        const current = reading(scopes[0] as Scope);
        return current ? sparkline(current.gain.daily, SPARK_DAYS) : { kind: "insufficient" };
      };

      return (
        <box flexDirection="column" minWidth={0}>
          {scopes.map((scope) => (
            <box flexDirection="column" minWidth={0}>
              <text fg={panelTone("muted")}>
                {`rtk · ${scopeLabel(scope)} · ${age(scope)} ago`}
              </text>
              <Show when={failure(scope)}>
                <text fg={panelTone("bad")}>{failure(scope)}</text>
              </Show>
              {details(scope).map((row) => (
                <text>
                  <span style={{ fg: panelTone("muted") }}>{row.label.padEnd(11)}</span>
                  <span style={{ fg: panelTone("text") }}>{row.value}</span>
                </text>
              ))}
            </box>
          ))}
          <Show when={spark().kind === "ok"}>
            <text fg={panelTone("subtle")}>{`last ${SPARK_DAYS} days`}</text>
            <text fg={panelTone("text")}>{(spark() as { cells: string }).cells}</text>
          </Show>
          <text fg={panelTone("subtle")}>
            {`${props.panel.width} cols · ${props.panel.presentation}`}
          </text>
        </box>
      );
    }

    if (surfaces.has("pane")) {
      ctx.ui.slot({
        append: "app",
        render: () => {
          ctx.keymap.layer(() => ({
            mode: "global",
            commands: [
              {
                id: PANEL_NAME,
                title: "Show rtk savings",
                description: "Token savings reported by rtk gain",
                group: "rtk",
                palette: true,
                slash: { name: "rtk" },
                run: () => {
                  ctx.ui.panel.open(PANEL_NAME);
                },
              },
            ],
          }));
          return null;
        },
      });

      ctx.ui.slot({
        append: "session.panel",
        render: (panelInput: PanelInput) => (
          <Show when={panelInput.name === PANEL_NAME}>
            <GainPanel panel={panelInput} />
          </Show>
        ),
      });
    }

    return () => {
      stopped = true;
      for (const timer of timers) clearTimeout(timer);
      clearInterval(interval);
    };
  },
});
