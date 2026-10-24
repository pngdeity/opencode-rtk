// opencode-theme — the visual shape of the context this plugin renders from.
//
// The host's `Context` is nominal: its `theme` is `ResolvedTheme` from
// `@opencode/theme`, a package that is a peer of the host and that a plugin does
// not install. Its slots and keymap are typed against the host's own OpenTUI
// copy. That makes every JSX comparison fail nominally even where the values are
// identical at runtime, and it makes the whole entry point uncheckable.
//
// This declaration narrows the members this plugin actually reads to their real
// runtime shape. It is the same trade `src/theme.ts` makes for colour tokens:
// name what is used, not where it came from.

declare module "@opencode/plugin/tui" {
  import type { ThemeTokens } from "../src/theme";

  type Cleanup = () => Promise<void> | void;

  type PanelInput = {
    readonly name: string;
    readonly sessionID: string;
    readonly width: number;
    readonly presentation: "panel" | "fullscreen";
    readonly focused: boolean;
    focus(): void;
    close(): void;
    toggleFullscreen(): void;
  };

  type SlotMap = {
    app: Record<string, never>;
    "home.footer": Record<string, never>;
    "home.footer.status": Record<string, never>;
    "prompt.footer": Record<string, never>;
    "prompt.footer.status": { sessionID?: string; mode: "normal" | "shell"; showDetails: boolean };
    "prompt.footer.file": Record<string, never>;
    "session.composer.top": { sessionID: string };
    "session.panel": PanelInput;
    "sidebar.content": { sessionID: string };
    "sidebar.footer": { sessionID: string };
  };

  type Context = {
    readonly options: unknown;
    readonly location: { readonly directory: string } | undefined;
    readonly theme: ThemeTokens;
    readonly ui: {
      slot(claim: { append: "prompt.footer.status"; render: () => unknown }): unknown;
      slot(claim: { append: "sidebar.content"; render: () => unknown }): unknown;
      slot(claim: { append: "app"; render: () => unknown }): unknown;
      slot(claim: { append: "session.panel"; render: (panel: PanelInput) => unknown }): unknown;
      panel: {
        open(name: string, options?: { presentation?: "panel" | "fullscreen" }): boolean;
        close(): void;
        current(): string | null;
      };
    };
    readonly keymap: { layer(factory: () => Record<string, unknown>): unknown };
  };

  export type { Context, PanelInput, SlotMap };

  type Result = Cleanup | undefined;
  type Setup = (context: Context) => Promise<Result> | Result;

  export const Plugin: {
    define<T extends { id: string; setup: Setup }>(plugin: T): T;
  };

  export function usePlugin(): Context;
  export const PluginContextProvider: unknown;
}
