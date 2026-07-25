// Derives a consistent lookup key for a fund/transfer/dividend row.
//
// Problem this solves: "General Account" (Cash) gets referred to two
// different ways across the data. Transfer Detail rows always carry
// Ticker = "Cash". The YTD Summary fund-level record for General Account
// has no real ticker (it's blank or "—"), so other code falls back to the
// fund name, "General Account". Those two strings never matched, so any
// code trying to look up General Account's live transfers/dividends by
// ticker would silently miss them — the leftover would land in whatever
// catch-all field the caller computed last (e.g. "Market Change").
//
// This treats "Cash" and "—" as both meaning "no real ticker," and always
// falls back to the trimmed fund name in that case — so a General Account
// row from Transfer Detail and a General Account row from YTD Summary
// resolve to the identical key.
export function fundKey(row) {
  if (!row) return null;
  const ticker = row.ticker ? String(row.ticker).trim() : '';
  const fund = row.fund ? String(row.fund).trim() : '';
  const isRealTicker = ticker && ticker !== '—' && ticker.toUpperCase() !== 'CASH';
  return isRealTicker ? ticker : (fund || ticker || null);
}
