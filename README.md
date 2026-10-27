# pageport

Fetch a web page and read it as text. pageport retrieves a URL over HTTP,
turns HTML pages into clean markdown-style text you can scan or quote, and
hands non-HTML responses back exactly as they arrive. Long pages are not a
problem: ask for a window of characters, then page forward through the
rest with an offset.

## What it does

- Sends a normal browser-style request and follows redirects.
- Converts HTML to readable markdown-style output: headings keep their
  levels, links keep their targets, lists stay lists, and script or style
  content is dropped instead of polluting the text.
- Returns the untouched document when you ask for raw output, and returns
  plain-text or other non-HTML bodies unchanged.
- Slices long results: choose where reading starts and how many
  characters come back. When a result is cut short, the output says so
  and tells you the offset to use for the next chunk.
- Reports failures plainly: an unreachable host or an error status comes
  back as an error result with the reason, never as empty success.

## CLI

```bash
npx @reneturcios/pageport fetch https://example.com
npx @reneturcios/pageport fetch https://example.com --max-length 2000
npx @reneturcios/pageport fetch https://example.com --start-index 2000 --max-length 2000
npx @reneturcios/pageport fetch https://example.com --raw
npx @reneturcios/pageport --version
```

Exit codes: 0 on success, 1 on a fetch error, 2 on a usage error.

## MCP server

The same binary runs as a stdio MCP server:

```bash
npx -y @reneturcios/pageport mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "pageport": {
      "command": "npx",
      "args": ["-y", "@reneturcios/pageport", "mcp"]
    }
  }
}
```

### Tool: `fetch`

Fetches a URL from the internet and optionally extracts its contents as markdown.

| Parameter | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `url` | string | yes | — | URL to fetch |
| `max_length` | integer | no | 5000 | Maximum number of characters to return |
| `start_index` | integer | no | 0 | Start index for content |
| `raw` | boolean | no | false | Return raw HTML instead of markdown conversion |

## Docker

```bash
docker run -i ghcr.io/cloudcorprecords/pageport
docker run --rm ghcr.io/cloudcorprecords/pageport fetch https://example.com
```

The container defaults to the `mcp` subcommand, so a plain `docker run -i`
is a working stdio MCP server.

## Development

```bash
npm install
npm run build
npm test
npm run dev
```

Tests cover the HTML conversion, the slicing and truncation behaviour,
and the fetch flow against injected responses — no network is needed.

## License

MIT — see `LICENSE`.
