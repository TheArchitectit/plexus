import { randomUUID } from "crypto";

/**
 * Headers that should not be forwarded in proxy requests
 * These are hop-by-hop headers and connection-specific headers
 */
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  // Also exclude authorization as we'll set our own
  "authorization",
  // Content encoding is handled by the client
  "content-encoding",
  // We may want to modify content length
  "content-length",
]);

/**
 * Filters headers for forwarding to provider
 * Removes hop-by-hop and connection-specific headers
 * @param headers - Original request headers
 * @returns Filtered headers suitable for forwarding
 */
export function filterHeadersForForwarding(headers: Headers): Record<string, string> {
  const filtered: Record<string, string> = {};

  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(lowerKey)) {
      filtered[key] = value;
    }
  });

  return filtered;
}

/**
 * Creates a request ID for correlation
 * @returns A new UUID
 */
export function createRequestId(): string {
  return randomUUID();
}

/**
 * Adds tracing headers to outgoing requests
 * @param headers - Headers object to modify
 * @param requestId - Request ID for tracing
 */
export function addTracingHeaders(
  headers: Record<string, string>,
  requestId: string
): Record<string, string> {
  return {
    ...headers,
    "x-request-id": requestId,
    "user-agent": "Plexus/0.1.0",
  };
}

/**
 * Converts Headers object to plain object
 * @param headers - Headers to convert
 * @returns Plain object representation
 */
export function headersToObject(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}
