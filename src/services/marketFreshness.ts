export const MARKET_PRICE_RECENT_MAX_AGE_DAYS = 3;

export type MarketPriceFreshness = 'recent' | 'stale' | 'unknown';

export function parseMarketPriceDate(priceDate: string | null | undefined): Date | null {
  const match = priceDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedPriceDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedPriceDate.getUTCFullYear() !== year ||
    parsedPriceDate.getUTCMonth() !== month - 1 ||
    parsedPriceDate.getUTCDate() !== day
  ) return null;

  return parsedPriceDate;
}

export function classifyMarketPriceFreshness(
  priceDate: string | null | undefined,
  now = new Date(),
): MarketPriceFreshness {
  const parsedPriceDate = parseMarketPriceDate(priceDate);
  if (!parsedPriceDate) return 'unknown';

  const currentDate = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const priceDay = parsedPriceDate.getTime();
  const ageInDays = Math.floor((currentDate - priceDay) / 86_400_000);

  if (ageInDays < 0) return 'unknown';
  return ageInDays <= MARKET_PRICE_RECENT_MAX_AGE_DAYS ? 'recent' : 'stale';
}