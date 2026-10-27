/**
 * pageport core: fetch a URL and turn the response into readable text.
 *
 * HTML pages are converted with a small deterministic converter built on
 * string and regex processing only (no external parser): script and style
 * blocks are removed, common block elements become markdown-ish lines,
 * links and emphasis keep their meaning, entities are decoded, and
 * whitespace is collapsed. Slicing (start_index, then max_length) is a
 * pure function so raw and converted content go through the exact same
 * path and tests never need the network.
 */
import type { FetchOptions, FetchResult, HttpFetchFn } from "./types.js";

export const VERSION = "0.1.0";

export const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const DEFAULT_MAX_LENGTH = 5000;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "(c)",
  mdash: "--",
  ndash: "-",
  hellip: "...",
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (body.startsWith("#")) {
      const code = parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body] ?? whole;
  });
}

function stripTags(fragment: string): string {
  return decodeEntities(fragment.replace(/<[^>]*>/g, ""));
}

/** Convert an HTML document to readable markdown-ish text. */
export function htmlToMarkdown(html: string): string {
  let out = html;

  // Drop content that never carries readable page text.
  out = out.replace(/<!--[\s\S]*?-->/g, " ");
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ");
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ");
  out = out.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, " ");
  out = out.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, " ");
  out = out.replace(/<svg\b[^>]*>[\s\S]*?<\/svg\s*>/gi, " ");

  // Preformatted blocks and inline code first, before tag handling mangles them.
  out = out.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre\s*>/gi, (_m, body: string) => {
    return `\n\n\`\`\`\n${stripTags(body).replace(/\n+$/, "")}\n\`\`\`\n\n`;
  });
  out = out.replace(/<code\b[^>]*>([\s\S]*?)<\/code\s*>/gi, (_m, body: string) => {
    return `\`${stripTags(body)}\``;
  });

  // Headings.
  for (let level = 1; level <= 6; level++) {
    const re = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}\\s*>`, "gi");
    out = out.replace(re, (_m, body: string) => {
      return `\n\n${"#".repeat(level)} ${stripTags(body).trim()}\n\n`;
    });
  }

  // Images and links.
  out = out.replace(/<img\b[^>]*>/gi, (tag) => {
    const alt = /\balt\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? /\balt\s*=\s*'([^']*)'/i.exec(tag)?.[1] ?? "";
    const src = /\bsrc\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? /\bsrc\s*=\s*'([^']*)'/i.exec(tag)?.[1] ?? "";
    if (!src) return "";
    return `![${decodeEntities(alt)}](${src})`;
  });
  out = out.replace(/<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi, (whole, body: string) => {
    const href =
      /\bhref\s*=\s*"([^"]*)"/i.exec(whole)?.[1] ?? /\bhref\s*=\s*'([^']*)'/i.exec(whole)?.[1] ?? "";
    const label = stripTags(body).trim();
    if (!href) return label;
    if (!label || label === href) return href;
    return `[${label}](${decodeEntities(href)})`;
  });

  // Emphasis.
  out = out.replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)\s*>/gi, (_m, body: string) => `**${stripTags(body)}**`);
  out = out.replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)\s*>/gi, (_m, body: string) => `*${stripTags(body)}*`);

  // Blockquotes and rules.
  out = out.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote\s*>/gi, (_m, body: string) => {
    const text = stripTags(body).trim().replace(/\n/g, "\n> ");
    return `\n\n> ${text}\n\n`;
  });
  out = out.replace(/<hr\b[^>]*>/gi, "\n\n---\n\n");

  // Lists: mark items, then let the block handling add the newlines.
  out = out.replace(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi, (_m, body: string) => {
    return `\n- ${stripTags(body).trim()}`;
  });
  out = out.replace(/<\/?(?:ul|ol)\b[^>]*>/gi, "\n");

  // Paragraph-like blocks and line breaks.
  out = out.replace(/<br\b[^>]*>/gi, "\n");
  out = out.replace(/<\/(?:p|div|section|article|header|footer|main|table|tr|figure|figcaption)\s*>/gi, "\n\n");
  out = out.replace(/<(?:p|div|section|article|header|footer|main|table|tr|figure|figcaption)\b[^>]*>/gi, "\n\n");

  // Whatever tags remain carry no text meaning on their own.
  out = out.replace(/<[^>]*>/g, "");
  out = decodeEntities(out);

  // Collapse whitespace: tidy lines, cap blank runs at one empty line.
  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

/**
 * Apply start_index, then truncate to max_length. When truncation happens
 * a note is appended telling the caller how to continue reading.
 */
export function sliceContent(
  content: string,
  startIndex = 0,
  maxLength = DEFAULT_MAX_LENGTH,
): { text: string; truncated: boolean } {
  const start = Math.max(0, startIndex);
  const limit = Math.max(0, maxLength);
  const rest = content.slice(start);
  if (rest.length <= limit) return { text: rest, truncated: false };
  const nextStart = start + limit;
  const note =
    `\n\nContent truncated. Call the fetch tool with a start_index of ${nextStart} ` +
    `to get more content.`;
  return { text: rest.slice(0, limit) + note, truncated: true };
}

/** Fetch a URL and return its readable text, sliced as requested. */
export async function fetchPage(
  fetchFn: HttpFetchFn,
  options: FetchOptions,
): Promise<FetchResult> {
  const maxLength = options.max_length ?? DEFAULT_MAX_LENGTH;
  const startIndex = options.start_index ?? 0;
  const raw = options.raw ?? false;

  let response;
  try {
    response = await fetchFn(options.url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/json,text/plain,*/*",
      },
      redirect: "follow",
    });
  } catch (err) {
    throw new Error(
      `Failed to fetch ${options.url}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${options.url}: HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType);
  const converted = isHtml && !raw ? htmlToMarkdown(body) : body;
  const { text, truncated } = sliceContent(converted, startIndex, maxLength);
  return { url: options.url, contentType, text, truncated };
}
