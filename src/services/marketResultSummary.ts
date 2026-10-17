// Pure, dependency-free helpers for summarizing market-price result sets.
// Kept separate from marketService.ts so they can be unit-tested in plain Node
// without importing the Vite/Supabase client (which reads import.meta.env).

/** Load outcome for a market-price query. */
export type MarketPriceLoadStatus =
  | 'ok' // records were returned
  | 'empty' // the query succeeded but matched no rows
  | 'error' // the database read failed
  | 'unconfigured'; // Supabase client is not configured

/**
 * Returns the maximum (latest) ISO date/timestamp string from a list, or null.
 * Invalid or missing values are ignored. If every value is invalid, returns null.
 */
export function maxIsoTimestamp(
  values: Array<string | null | undefined>,
): string | null {
  let latest: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) continue;
    if (time > latestTime) {
      latestTime = time;
      latest = value;
    }
  }
  return latest;
}
