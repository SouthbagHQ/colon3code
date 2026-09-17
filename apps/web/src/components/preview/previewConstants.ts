/** Cap for the per-thread "recently seen" URL list shown in the empty state. */
export const PREVIEW_RECENT_URL_LIMIT = 10;

/**
 * Common Chromium error codes mapped to a short human label. Used by the
 * unreachable view to drop the raw `ERR_*` code in favour of friendlier copy.
 */
export const PREVIEW_ERROR_CODE_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  ERR_NAME_NOT_RESOLVED: "DNS address could not be found",
  ERR_NAME_RESOLUTION_FAILED: "DNS address could not be found",
  ERR_CONNECTION_REFUSED: "connection refused",
  ERR_CONNECTION_RESET: "connection was reset",
  ERR_CONNECTION_CLOSED: "connection was closed",
  ERR_CONNECTION_TIMED_OUT: "connection timed out",
  ERR_INTERNET_DISCONNECTED: "no internet connection",
  ERR_TIMED_OUT: "connection timed out",
  ERR_CERT_AUTHORITY_INVALID: "certificate authority is not trusted",
  ERR_CERT_COMMON_NAME_INVALID: "certificate hostname mismatch",
  ERR_CERT_DATE_INVALID: "certificate is expired or not yet valid",
  ERR_TOO_MANY_REDIRECTS: "too many redirects",
});
