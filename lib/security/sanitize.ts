/** Escape special chars for PostgREST ilike / or() filter strings. */
export function sanitizeIlikeTerm(raw: string, maxLen = 80): string {
  return raw
    .trim()
    .slice(0, maxLen)
    .replace(/[%_,()]/g, '');
}

export function truncateForLlm(value: unknown, maxChars = 6000): string {
  const json = JSON.stringify(value);
  if (json.length <= maxChars) return json;
  return `${json.slice(0, maxChars)}…[truncated]`;
}
