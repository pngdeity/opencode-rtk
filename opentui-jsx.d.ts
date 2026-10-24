// opentui-jsx — the element types a plugin's entry point renders into.
//
// The plugin API hands slot renderers a `JSX.Element` from the HOST's copy of
// `@opentui/solid`, reached through the host's own dependency graph. A plugin
// resolves `@opentui/solid` from its own install, and two copies of an interface
// are never the same type, so every attribute is checked against the host's
// `SpanProps` and rejected.
//
// A `jsxImportSource` pragma resolves `JSX` from `@opentui/solid/jsx-runtime`.
// Re-declaring that interface here — with `Element` widened to `unknown`, the one
// member two copies cannot agree on — makes the plugin's own JSX structurally
// acceptable to the host's slot API without changing what is checked.

import type { RGBA } from "@opentui/core";

declare module "@opentui/solid/jsx-runtime" {
  namespace JSX {
    type Element = unknown;

    interface IntrinsicElements {
      box: import("@opentui/solid").BoxProps;
      text: import("@opentui/solid").TextProps;
      span: import("@opentui/solid").SpanProps & {
        fg?: string | RGBA | undefined;
      };
      b: import("@opentui/solid").SpanProps;
      strong: import("@opentui/solid").SpanProps;
      i: import("@opentui/solid").SpanProps;
      em: import("@opentui/solid").SpanProps;
      u: import("@opentui/solid").SpanProps;
      br: import("@opentui/solid").SpanProps;
      a: import("@opentui/solid").LinkProps;
      scrollbox: import("@opentui/solid").ScrollBoxProps;
      code: import("@opentui/solid").CodeProps;
      markdown: import("@opentui/solid").MarkdownProps;
    }
  }
}
