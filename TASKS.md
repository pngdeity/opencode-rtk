# Tasks

<!-- Agent contract
     Read this file before asking what to work on.
     Claim a task by appending (@agent-id) to its line, before starting.
     Remove a task only when its Verification command succeeds. Your belief that
     it works is not evidence.
     Add work you discover under the tier it belongs to, with an ID and a
     Verification command. Default to P2 when unsure.
     Do not reprioritize someone else's task. Record the concern in its Details
     and leave the priority alone.
-->

<!-- A task is a checkbox plus nested metadata fields, as in the P1 example.
     Completed tasks are removed, never checked off: put `closes <id>` in the
     commit and git log becomes the archive.
     Priority: P0 broken or users blocked. P1 planned work. P2 valuable, not
     blocking. P3 someday, kept for reference.
     Full field reference: README, Task tracking section.
-->

<!-- policy: Run tests before every commit. Never skip CI checks.
     policy: Prefer fixing root causes over symptoms. -->

## P0

## P1

## P2

- [ ] Gate `tsc --noEmit` in CI
  - **ID**: ci-typecheck-gate
  - **Tags**: ci, typescript
  - **Details**: `bunx tsc --noEmit` is a local gate (README, AGENTS.md) but
    `.github/workflows/node.yml` runs only biome and `bun test`, so a type
    regression reaches `main` green. Add it to the `lint` job after
    `bun install --frozen-lockfile`, or as its own job. Note that
    `devDependencies` carries the five type-only packages (`@opencode/plugin`,
    `@opentui/core`, `@opentui/solid`, `solid-js`, `bun-types`) for exactly this
    and nothing at runtime; frozen-lockfile install covers them.
  - **Acceptance**: A push that breaks `tsc --noEmit` fails CI on the same
    success criteria the local command uses. No other job changes behaviour.
  - **Verification**: `rg -q "tsc --noEmit" .github/workflows/node.yml`
  - **Files**: `.github/workflows/node.yml`
  - **Touches**: `.github/workflows/node.yml`

- [ ] Record the two type-seam declarations
  - **ID**: record-type-seams
  - **Tags**: docs, typescript
  - **Details**: `opencode-tui.d.ts` and `opentui-jsx.d.ts` exist because the
    host's `@opencode/plugin/tui/context` types reach `@opencode/theme` (not
    installed here) and because two nominal copies of the host `JSX` namespace
    reject every attribute. That is a settled finding with a measurement behind
    it, not an open decision, so it belongs in `docs/records/` under a name
    stating the conclusion. Include what was tried first (ambient `declare
    module` in a `.ts` file is a module and replaces the interface), and the
    `span`/`style={{ fg }}` detail, so the next author does not rediscover it.
  - **Acceptance**: One record file following `docs/records/README.md`, stating
    the finding in its first two sentences and dating the measurement. No source
    file changes.
  - **Verification**: `test -n "$(git status --porcelain -- docs/records)"`
  - **Files**: `docs/records/`
  - **Touches**: `docs/records/`

- [ ] Convert the host rtk resolver to a directory
  - **ID**: host-directory-resolver
  - **Tags**: install, host
  - **Details**: On this machine the plugin loads through
    `~/.config/opencode/plugins/rtk/index.ts`, a loose file re-exporting the
    package default. A loose file cannot carry the TUI half, and a resolver's
    re-export passes no options. Make it a directory with `index.ts` and
    `tui.tsx` and give `cli.json` the object form so `surfaces` is delivered.
    README documents the layout. Requires the registry release that ships
    `./tui`; until then the host copy has no TUI to load.
  - **Acceptance**: `~/.config/opencode/plugins/rtk/` holds both entrypoints,
    `cli.json` names the directory with options, and a restarted OpenCode shows
    the selected surfaces.
  - **Verification**: `test -f ~/.config/opencode/plugins/rtk/tui.tsx && rg -q '\./plugins/rtk' ~/.config/opencode/cli.json`
  - **Files**: `README.md`
  - **Touches**: `README.md`

- [ ] Standing audit loop — run once, then delete this block (@agent-id)
  - **ID**: standing-audit-gap-loop
  - **Tags**: standing-loop, meta
  - **Details**: Audit this repository for work that is missing from the queue:
    unfinished TODO/FIXME/HACK annotations, documentation that contradicts the
    code, CI checks that no longer match the build, and dependency or tool
    versions that have drifted. Queue what you find; fix nothing in this run.
    Rewrite this Details field for this repository before running it — a
    generic brief produces generic tasks.
  - **Acceptance**: Every finding is a task in the tier it belongs to, with an
    ID, Details, and a Verification command. No finding is duplicated by an
    existing task. This block is removed in the same commit. No source file
    outside TASKS.md changed.
  - **Verification**: `npx @tasks-md/lint TASKS.md && test -z "$(git status --porcelain -- . ':!TASKS.md')"`
  - **Files**: `TASKS.md`, `AGENTS.md`, `docs/`
  - **Touches**: `TASKS.md`

## P3
