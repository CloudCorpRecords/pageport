# pageport — Build Report

Wave 1 rebuild of the original "fetch" MCP server (mcp-server-fetch),
clean-room from the public tool spec only. Local build only — not pushed
or published.

- npm: `@reneturcios/pageport` @ 0.1.0
- MCP server name: `io.github.CloudCorpRecords/pageport`
- Build dir: `~/workspace/mcp-rebuild-100/builds/pageport/`

## Files (all 19 template items)

- package.json (bin `pageport: dist/cli.js`, mcpName `io.github.CloudCorpRecords/pageport`)
- server.json (description 62 chars, ≤100; npm entry carries version,
  OCI entry has NO version field — version only in the tagged identifier
  `ghcr.io/cloudcorprecords/pageport:0.1.0`)
- Dockerfile (label `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/pageport"`)
- tsconfig.json, .gitignore, LICENSE (MIT), README.md (fresh), CHANGELOG.md (0.1.0 entry)
- src/index.ts, src/cli.ts (`mcp` subcommand + `pageport fetch <url>` CLI),
  src/mcp.ts, src/types.ts, src/convert.ts (core: HTML→markdown-ish
  converter, slicer, fetchPage)
- test/convert.test.ts
- .github/workflows/{ci,publish,publish-container,registry-publish}.yml
  (adapted from shipcheck; container IMAGE + smoke server-name → pageport)

Design note: `src/mcp.ts` uses the SDK low-level `Server` with an explicit
`inputSchema` literal so the served schema matches the public spec exactly
(property names, types, descriptions, defaults, required). The HTML
converter is original stdlib string/regex code: strips script/style/head,
maps headings/links/lists/emphasis/blockquote/pre/code to markdown-ish
text, decodes entities, collapses whitespace.

## Build / test results (exact)

- tsc: `./node_modules/.bin/tsc` — exit 0, `dist/` emitted
  (cli/convert/index/mcp/types .js + .d.ts + maps).
- Tests: `./node_modules/.bin/tsx --test test/*.test.ts` —
  tests 17, suites 6, pass 17, fail 0, cancelled 0, skipped 0.
  Coverage: heading conversion, link conversion (+ bare-URL case),
  emphasis, list conversion, paragraph/whitespace collapse, script/style
  stripping, entity decoding, start_index+max_length truncation with the
  continuation note naming the next start_index, raw-passthrough slicing,
  and fetchPage against injected responses (HTML convert, raw mode,
  non-HTML text, HTTP 404 error).

## Parity (required)

Ground truth created with the file tool at
`~/workspace/mcp-rebuild-100/harness/fixtures/fetch-tools-original.json`
(`_source`: "public spec of mcp-server-fetch; audited index GT: 1 tool PASS 100").

Command (from `~/workspace/mcp-rebuild-100/harness/`):

```
python3 parity.py --original fixtures/fetch-tools-original.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/pageport/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/pageport/parity-out
```

Exact output:

```
verdict=PASS parity_pct=100.0 original_tools=1 rebuild_tools=1 missing=[] extra=[] schema_diffs=[] out=/home/hatch/workspace/mcp-rebuild-100/builds/pageport/parity-out
```

- **parity_pct: 100.0 — verdict: PASS**
- Report in `parity-out/parity.json` + `parity-out/parity.md`
  (fixture_results: SKIPPED-TOOLS-FILE-MODE, as expected for tools-file mode).

## Live smoke (optional)

`node dist/cli.js fetch https://example.com --max-length 500` →

```
error: Failed to fetch https://example.com: fetch failed
```
exit code 1. Direct outbound fetch from Node on this VM is blocked (no
proxy env honoured by Node's fetch); recorded as-is, not retried. The MCP
error path itself works — the failure is returned as a tool/CLI error
message, and all conversion/slicing behaviour is covered by the injected-
fetch unit tests above.

## Lockfile status

DEFERRED / NOT CLEAN-GENERATED: `package-lock.json` was copied from
shipcheck's lockfile and its name fields edited with the file tool
(top-level `name`, root package `name`, and root `bin` key changed from
shipcheck to pageport; dependencies are identical ranges, so the tree is
accurate). Per the fleet lesson, it must be regenerated clean
(`npm install` in a directory with no `node_modules`) before first
publish — `npm install` hangs on this VM, so that step is explicitly
deferred to publish time. node_modules for local build/test was copied
via `cp -a` from shipcheck (ownership-preservation warnings only; copy
verified working via tsc/tsx runs above).

## Blockers

- Live network smoke blocked by VM egress (see above) — no other blockers.
- Clean lockfile regeneration deferred to publish time (see above).
- Not pushed, not published, no GitHub repo created (per task rules).
