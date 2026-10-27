import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { htmlToMarkdown, sliceContent, fetchPage, decodeEntities } from "../src/convert.js";
import type { HttpFetchFn } from "../src/types.js";

describe("htmlToMarkdown headings", () => {
  it("converts h1 and h2 to markdown headings", () => {
    const out = htmlToMarkdown("<h1>Title</h1><p>body</p><h2>Section</h2>");
    assert.ok(out.includes("# Title"), out);
    assert.ok(out.includes("## Section"), out);
    assert.ok(out.includes("body"), out);
  });
  it("converts h3 through h6 with the right depth", () => {
    const out = htmlToMarkdown("<h3>Deep</h3><h6>Deepest</h6>");
    assert.ok(out.includes("### Deep"), out);
    assert.ok(out.includes("###### Deepest"), out);
  });
});

describe("htmlToMarkdown links and emphasis", () => {
  it("converts anchors to markdown links", () => {
    const out = htmlToMarkdown('<p>See <a href="https://example.com/docs">the docs</a> now</p>');
    assert.ok(out.includes("[the docs](https://example.com/docs)"), out);
  });
  it("keeps a bare URL when the link label is the URL", () => {
    const out = htmlToMarkdown('<a href="https://example.com">https://example.com</a>');
    assert.ok(out.includes("https://example.com"), out);
    assert.ok(!out.includes("[https://example.com](https://example.com)"), out);
  });
  it("converts strong and em", () => {
    const out = htmlToMarkdown("<p><strong>bold</strong> and <em>italic</em></p>");
    assert.ok(out.includes("**bold**"), out);
    assert.ok(out.includes("*italic*"), out);
  });
});

describe("htmlToMarkdown lists and structure", () => {
  it("converts list items to dash lines", () => {
    const out = htmlToMarkdown("<ul><li>first</li><li>second</li></ul>");
    assert.ok(out.includes("- first"), out);
    assert.ok(out.includes("- second"), out);
  });
  it("separates paragraphs and collapses excess blank lines", () => {
    const out = htmlToMarkdown("<p>one</p><p>two</p>");
    assert.ok(out.includes("one"), out);
    assert.ok(out.includes("two"), out);
    assert.ok(!out.includes("\n\n\n"), out);
  });
});

describe("htmlToMarkdown stripping", () => {
  it("strips script and style content entirely", () => {
    const html =
      "<html><head><style>.x{color:red}</style></head><body>" +
      "<p>keep me</p><script>var secret = 1; track()</script></body></html>";
    const out = htmlToMarkdown(html);
    assert.ok(out.includes("keep me"), out);
    assert.ok(!out.includes("secret"), out);
    assert.ok(!out.includes("color:red"), out);
    assert.ok(!out.includes("track()"), out);
  });
  it("decodes common entities", () => {
    assert.equal(decodeEntities("fish &amp; chips &lt;tag&gt;"), "fish & chips <tag>");
    const out = htmlToMarkdown("<p>fish &amp; chips</p>");
    assert.ok(out.includes("fish & chips"), out);
  });
});

describe("sliceContent truncation", () => {
  it("returns short content untouched with no note", () => {
    const { text, truncated } = sliceContent("hello", 0, 5000);
    assert.equal(text, "hello");
    assert.equal(truncated, false);
  });
  it("applies start_index before truncating", () => {
    const { text, truncated } = sliceContent("0123456789abcdef", 4, 5);
    assert.equal(truncated, true);
    assert.ok(text.startsWith("45678"), text);
  });
  it("appends a truncation note naming the next start_index", () => {
    const { text, truncated } = sliceContent("a".repeat(100), 10, 20);
    assert.equal(truncated, true);
    assert.ok(text.includes("truncated"), text);
    assert.ok(text.includes("start_index of 30"), text);
    assert.ok(text.startsWith("a".repeat(20)), text);
  });
  it("serves as raw passthrough: raw HTML is sliced, not converted", () => {
    const rawHtml = "<html><body><h1>Raw Title</h1></body></html>";
    const { text, truncated } = sliceContent(rawHtml, 0, 5000);
    assert.equal(text, rawHtml);
    assert.equal(truncated, false);
  });
});

describe("fetchPage with injected fetch", () => {
  const htmlFetch: HttpFetchFn = async () => ({
    ok: true,
    status: 200,
    headers: { get: (n: string) => (n.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null) },
    text: async () => "<h1>Hello</h1><p>world</p>",
  });

  it("converts HTML responses to markdown by default", async () => {
    const result = await fetchPage(htmlFetch, { url: "https://example.com" });
    assert.ok(result.text.includes("# Hello"), result.text);
    assert.ok(result.text.includes("world"), result.text);
  });

  it("returns raw HTML when raw is true", async () => {
    const result = await fetchPage(htmlFetch, { url: "https://example.com", raw: true });
    assert.ok(result.text.includes("<h1>Hello</h1>"), result.text);
  });

  it("returns non-HTML content as plain text", async () => {
    const textFetch: HttpFetchFn = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "text/plain" },
      text: async () => "plain body",
    });
    const result = await fetchPage(textFetch, { url: "https://example.com/x.txt" });
    assert.equal(result.text, "plain body");
  });

  it("throws on an HTTP error status", async () => {
    const failFetch: HttpFetchFn = async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: { get: () => null },
      text: async () => "missing",
    });
    await assert.rejects(
      () => fetchPage(failFetch, { url: "https://example.com/nope" }),
      /HTTP 404/,
    );
  });
});
