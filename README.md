# @pngdeity/opencode-rtk

Thin OpenCode V2 plugin that delegates `bash` / `shell` tool command rewriting to `rtk rewrite` (`rtk >= 0.51.0`).

## Installation

```bash
opencode plugin add @pngdeity/opencode-rtk
```

Or in `opencode.jsonc`:

```jsonc
{
  "plugins": [
    "@pngdeity/opencode-rtk"
  ]
}
```

## Configuration

Set `RTK_DISABLE=1` in the environment or pass `"options": { "disabled": true, "timeoutMs": 2000 }` in `opencode.jsonc` to configure or disable the plugin.

## Local development loop (no live reload)

Editing this repository does **not** change what a running OpenCode server loads,
provided the installation pins the plugin as a packed tarball rather than a path.
Keep development in this repo and run the tests here:

```bash
bun test
```

Apply a change when you choose to, not when a file is saved:

```bash
bun pm pack --destination ~/.local/share/opencode/packs
cd ~/.config/opencode
bun add --no-progress --linker=hoisted \
  "file:$HOME/.local/share/opencode/packs/<the tarball pack printed>.tgz"
opencode service restart
```

Three rules that make this work:

- **`--linker=hoisted` is required.** The `isolated` layout nests the package
  under `node_modules/.bun/`, where a bare specifier imported from a plugin
  resolver does not resolve.
- **Re-packing over an existing tarball name needs `bun install --force`**;
  without it bun reports "no changes" and keeps the previously installed copy.
- **The tarball is a dependency record, so it lives outside `/tmp`.** It is what
  the host's `bun.lock` names; a cleanup or reboot that removes it makes the next
  `bun install` fail and the plugin silently stop loading. Use
  `~/.local/share/opencode/packs/`.

A `file:` dependency on the repository **directory** instead of a tarball
resolves through a symlink, which makes this repo the loaded code and every save
live watcher traffic — the interruption this loop exists to avoid.

Installing from a registry with `opencode plugin add <package>` or a `plugins`
array entry is the same model with the registry in place: the loaded copy is
immutable, application is an explicit version bump, and a new version needs a
restart.
