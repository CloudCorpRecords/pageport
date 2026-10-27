/**
 * pageport MCP server. Tool: fetch.
 *
 * The tool list is served with an explicit inputSchema so the published
 * schema matches the public spec exactly: property names, types,
 * descriptions, defaults, and the single required field.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fetchPage, VERSION } from "./convert.js";
import type { HttpFetchFn } from "./types.js";

export const FETCH_TOOL = {
  name: "fetch",
  description:
    "Fetches a URL from the internet and optionally extracts its contents as markdown.",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to fetch" },
      max_length: {
        type: "integer",
        description: "Maximum number of characters to return",
        default: 5000,
      },
      start_index: {
        type: "integer",
        description: "Start index for content",
        default: 0,
      },
      raw: {
        type: "boolean",
        description: "Return raw HTML instead of markdown conversion",
        default: false,
      },
    },
    required: ["url"],
  },
} as const;

const server = new Server(
  { name: "pageport", version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [FETCH_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  if (name !== "fetch") {
    return {
      content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  const url = typeof args.url === "string" ? args.url : "";
  if (!url) {
    return {
      content: [{ type: "text" as const, text: "Error: url is required" }],
      isError: true,
    };
  }
  try {
    const result = await fetchPage(globalThis.fetch as unknown as HttpFetchFn, {
      url,
      max_length: typeof args.max_length === "number" ? args.max_length : undefined,
      start_index: typeof args.start_index === "number" ? args.start_index : undefined,
      raw: typeof args.raw === "boolean" ? args.raw : undefined,
    });
    return { content: [{ type: "text" as const, text: result.text }] };
  } catch (err) {
    return {
      content: [
        {
          type: "text" as const,
          text: err instanceof Error ? err.message : String(err),
        },
      ],
      isError: true,
    };
  }
});

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

void main();
