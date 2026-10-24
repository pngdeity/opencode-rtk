> All notable changes to this project are documented here. The format is
> [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
> adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
>
> Entries are written when a version is released, not while it is being built:
> release notes are for the people reading them later. Group changes under
> `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`, and
> write each as a user-visible statement rather than a commit subject.

## [Unreleased]

### Added

- TUI half at `./tui`, opt-in per surface: a `prompt.footer.status` one-liner, a
  `sidebar.content` block, and an `rtk.gain` session panel opened from the
  command palette or `/rtk`. Enable with `"surfaces": ["all"]` in the plugin's
  `options`; with no `surfaces` the TUI registers nothing.
- `scopes` option to read this project's rewrites (rtk `-p`, the default) or
  every rewrite on the machine. Each surface labels which scope it shows, and
  reads older than a minute render as stale rather than as current.
- `bunx tsc --noEmit` is now a gate; `tsconfig.json` and the two declaration
  seams (`opencode-tui.d.ts`, `opentui-jsx.d.ts`) typecheck the TUI off the
  running host.

[Unreleased]: https://github.com/pngdeity/opencode-rtk/compare/v0.1.0...HEAD
