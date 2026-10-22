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
