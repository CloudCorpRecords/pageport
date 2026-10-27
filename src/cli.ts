#!/usr/bin/env node
/**
 * pageport CLI.
 *
 *   pageport fetch <url> [--max-length n] [--start-index n] [--raw]
 *   pageport mcp
 *
 * Exit codes: 0 success, 1 fetch error, 2 usage error.
 */
import { fetchPage, VERSION } from "./convert.js";
import type { HttpFetchFn } from "./types.js";

function usage(): never {
  console.error(`Usage:
  pageport fetch <url> [--max-length n] [--start-index n] [--raw]
  pageport mcp
  pageport --version`);
  process.exit(2);
}

function intFlag(args: string[], name: string): number | undefined {
  const idx = args.indexOf(name);
  if (idx < 0 || idx + 1 >= args.length) return undefined;
  const value = Number.parseInt(args[idx + 1], 10);
  return Number.isFinite(value) ? value : undefined;
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "--version" || cmd === "-v") {
    console.log(VERSION);
    return;
  }
  if (cmd === "mcp") {
    await import("./mcp.js");
    return;
  }
  if (!cmd) usage();
  if (cmd === "fetch") {
    const known = new Set(["--max-length", "--start-index", "--raw"]);
    const positional: string[] = [];
    for (let i = 0; i < rest.length; i++) {
      const a = rest[i];
      if (a === "--max-length" || a === "--start-index") i++;
      else if (!known.has(a)) positional.push(a);
    }
    const [url] = positional;
    if (!url) usage();
    try {
      const result = await fetchPage(globalThis.fetch as unknown as HttpFetchFn, {
        url,
        max_length: intFlag(rest, "--max-length"),
        start_index: intFlag(rest, "--start-index"),
        raw: rest.includes("--raw"),
      });
      console.log(result.text);
    } catch (err) {
      console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
    return;
  }
  usage();
}

void main();
