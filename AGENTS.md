# AGENTS.md

<!-- Keep this file short. It is a table of contents, not a manual: instructions
     that are not in context while an agent is working do not exist, and a second
     full copy of the README rots into rules nobody can verify. Long-form
     decisions belong in docs/ or the README, referenced from here. -->

## This repository

This repository is `opencode-rtk`. OpenCode V2 plugin that delegates shell command rewriting to rtk for token savings

What lives where:

- Read `README.md` before changing anything a user sees: install, usage, and
  the published surface are described there.
- `TASKS.md` is the work queue. Claim a task before starting it; remove it only
  when its `**Verification**` command succeeds.
- Long-form decisions belong in `docs/`. When you make one, write it down there
  rather than leaving it in a commit message. `docs/records/` explains what
  earns a record and how to name one.
- `scripts/audit.py` checks that this repository still has the files the
  template assumes. Run it after moving anything at the root.

## Commands

Run these before claiming work is done.

Commands are grouped by language. Run each from the repository root.

### Node.js

```bash
bun install
bun test
bunx biome check .
bunx tsc --noEmit
python3 scripts/audit.py
```

There is no build step: `src/index.ts` is the plugin, and `index.ts` re-exports
its default and its named surface as the manifest entrypoint. `biome.json` is
the formatter and linter of record; it turns off `noExplicitAny` because the
OpenCode event and tool signatures are untyped at this boundary.

## Task tracking

`TASKS.md` is the work queue. Read it before asking what to do.

- Claim a task by appending `(@agent-id)` to its line.
- Remove a task block only when its `**Verification**` command succeeds. Treat
  your own belief that the work is complete as a claim, not evidence.
- Put `closes <task-id>` in the completion commit; git log is the archive.
- Add work you discover at the end of the priority tier it belongs to, with an
  ID and a Verification command. Default to P2 when unsure of the tier.
- Do not reprioritize or restructure someone else's task. Record the concern in
  its Details and leave the priority alone.

### When the queue is blocked

If every remaining task is blocked, do not idle and do not pick a blocked task
anyway. Spend the turn on read-only research against the most promising one:

- Append findings to its `**Research**` field under a dated subheading
  (`### 2026-10-22`). Keep `**Details**` as the author wrote it — that field is
  intent, `Research` is what you found.
- Stamp `**Last-enriched**: YYYY-MM-DD`. Respect a seven-day cooldown per task;
  one enrichment per turn.
- Never edit `**Blocked**` or `**Blocked by**`. If your research shows a blocker
  is gone, say so in the task's Details and ask; clearing a blocker is the
  owner's decision.
- If a task is blocked because an action is forbidden to you rather than
  impossible, add `**Blocked**: needs-user-approval —` with the reason instead of
  silently skipping it, so the next session does not retry the same thing.

### Disagreeing with the queue

Priority and structure belong to whoever wrote the task. If you think a task is
mis-prioritised, wrong, or obsolete, write the objection into its Details and
ask. Do not move it between tiers, do not delete it, and do not quietly do
something else.

The field-by-field format is defined in the README's Task tracking section.

## Inline annotations

`TODO` is planned work and is allowed.
`FIXME`, `HACK`, and `BUG` mark debt that should be resolved or converted into a
task; no CI check enforces this here.
Format is the uppercase tag, a colon, then an imperative description, with an
issue or task reference when one exists.

```text
// TODO: implement retry logic (#42)
// FIXME: panics on empty input
```

## Conventions

- Long-form decisions and design notes go in `docs/`.
