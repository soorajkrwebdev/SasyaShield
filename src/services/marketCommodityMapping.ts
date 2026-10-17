import type { MarketPriceRecord } from '../types';

export const COMMODITY_ALIASES: Record<string, string[]> = {
  Arecanut: ['Arecanut', 'Areca nut', 'Betelnut', 'Betel nut', 'Supari', 'Chali', 'Arecanut(Betelnut/Supari)'],
  Coconut: ['Coconut'],
  Copra: ['Copra'],
  'Black Pepper': ['Black pepper'],
  Banana: ['Banana', 'Banana (Ripe)', 'Banana (Raw)', 'Yelakki', 'Nendran', 'Robusta'],
  Coffee: ['Coffee', 'Coffee Raw', 'Coffee Arabica', 'Coffee Robusta', 'Parchment'],
  Cardamom: ['Cardamom', 'Small Cardamom', 'Green Cardamom'],
  Ginger: ['Ginger', 'Ginger (Green)', 'Fresh Ginger', 'Dry Ginger'],
  Turmeric: ['Turmeric', 'Turmeric (Raw)', 'Turmeric Finger', 'Curcuma'],
  // Sweep-mode stores raw upstream labels verbatim, so each AGMARKNET variant is
  // its own key here. Paddy/Ragi grades are intentionally NOT folded into one
  // another (and Rice is NOT equated with Paddy) until the upstream's exact
  // strings are confirmed — the sweep import will reveal the true labels first.
  Paddy: ['Paddy'],
  'Paddy(Dhan)(Common)': ['Paddy(Dhan)(Common)'],
  Ragi: ['Ragi'],
  Onion: ['Onion'],
  Potato: ['Potato'],
  Maize: ['Maize'],
  Tomato: ['Tomato'],
};

const VERIFIED_SOURCE_LABELS: Record<string, string[]> = {
  Arecanut: ['Arecanut(Betelnut/Supari)'],
  Coconut: ['Coconut'],
  'Black Pepper': ['Black pepper'],
};

const SOURCE_TO_CANONICAL = new Map(
  Object.entries(VERIFIED_SOURCE_LABELS).flatMap(([canonical, sources]) =>
    sources.map((source) => [source.toLowerCase(), canonical] as const),
  ),
);

export function getCommoditySearchTerms(cropName: string): string[] {
  const trimmed = cropName.trim();
  const normalized = trimmed.toLowerCase();

  for (const [standardName, aliases] of Object.entries(COMMODITY_ALIASES)) {
    if (standardName.toLowerCase() === normalized || aliases.some((alias) => alias.toLowerCase() === normalized)) {
      const verified = VERIFIED_SOURCE_LABELS[standardName];
      if (verified) return verified;
      // Single-identity sweep labels (Tomato, Ragi, ...) must not duplicate.
      if (aliases.length === 1 && aliases[0].toLowerCase() === standardName.toLowerCase()) {
        return [standardName];
      }
      return [standardName, ...aliases];
    }
  }

  return [trimmed];
}

export function getCanonicalCommodityName(sourceCrop: string): string {
  return SOURCE_TO_CANONICAL.get(sourceCrop.trim().toLowerCase()) ?? sourceCrop;
}

export function mapMarketPriceRow(row: Record<string, unknown>): MarketPriceRecord {
  const crop = String(row.crop ?? '');

  return {
    id: String(row.id ?? ''),
    crop,
    canonical_crop: getCanonicalCommodityName(crop),
    state: String(row.state ?? ''),
    district: String(row.district ?? ''),
    market: String(row.market ?? ''),
    price_date: String(row.price_date ?? ''),
    min_price: row.min_price != null ? Number(row.min_price) : undefined,
    max_price: row.max_price != null ? Number(row.max_price) : undefined,
    modal_price: Number(row.modal_price),
    unit: row.unit != null ? String(row.unit) : 'INR/quintal',
    source_name: row.source_name != null ? String(row.source_name) : 'AGMARKNET / DMI',
    source_url: row.source_url != null ? String(row.source_url) : null,
    variety: row.variety != null ? String(row.variety) : null,
    grade: row.grade != null ? String(row.grade) : null,
    fetched_at: row.fetched_at != null ? String(row.fetched_at) : null,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
  };
}