/**
 * pageport types.
 *
 * A single fetch operation takes a URL plus slicing controls and yields
 * plain text: either markdown converted from HTML, the raw document when
 * requested, or the untouched body of a non-HTML response.
 */

export interface FetchOptions {
  url: string;
  /** Maximum number of characters to return. Defaults to 5000. */
  max_length?: number;
  /** Character offset to start returning content from. Defaults to 0. */
  start_index?: number;
  /** When true, return raw HTML instead of converting to markdown. */
  raw?: boolean;
}

export interface FetchResult {
  url: string;
  contentType: string;
  text: string;
  /** True when the returned text was cut to max_length. */
  truncated: boolean;
}

/** Minimal HTTP response surface so tests can inject fixtures. */
export interface HttpResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type HttpFetchFn = (
  url: string,
  init?: { headers?: Record<string, string>; redirect?: string },
) => Promise<HttpResponse>;
