# Changelog

## 0.1.0 (2026-10-26)

- Initial release.
- `fetch` MCP tool: fetch a URL, convert HTML to readable markdown-style
  text, return non-HTML bodies as plain text, and slice results with
  `max_length` and `start_index` (with a continuation note when output
  is truncated).
- `raw` option returns the original HTML instead of converting it.
- CLI: `pageport fetch <url>` with `--max-length`, `--start-index`, and
  `--raw`; `pageport mcp` runs the stdio MCP server from the same binary.
