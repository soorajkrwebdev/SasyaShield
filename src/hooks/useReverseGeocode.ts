import { useEffect, useState } from 'react';

export interface ReverseGeocodeResult {
  displayName: string | null;
  loading: boolean;
  error: string | null;
  source: 'cache' | 'nominatim' | 'fallback' | 'none';
}

interface CacheEntry { name: string; ts: number; }
const memCache = new Map<string, CacheEntry>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days — locality names are stable

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function readCache(key: string): string | null {
  const m = memCache.get(key);
  if (m && Date.now() - m.ts < CACHE_TTL) return m.name;
  try {
    const raw = localStorage.getItem(`smartfarm_revgeo_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw) as CacheEntry;
      if (Date.now() - parsed.ts < CACHE_TTL) {
        memCache.set(key, parsed);
        return parsed.name;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function writeCache(key: string, name: string) {
  const entry = { name, ts: Date.now() };
  memCache.set(key, entry);
  try { localStorage.setItem(`smartfarm_revgeo_${key}`, JSON.stringify(entry)); } catch { /* ignore */ }
}

export function formatNominatimAddress(addr: any): string {
  if (!addr) return '';
  const village = addr.village || addr.hamlet || addr.suburb || addr.neighbourhood || addr.town || addr.city_district;
  const city = addr.city || addr.town || addr.municipality;
  const district = addr.county || addr.state_district || addr.district;
  const state = addr.state;
  const country = addr.country;
  const parts: string[] = [];
  if (village && village !== city && village !== district) parts.push(village);
  if (city && city !== district) parts.push(city);
  if (district) parts.push(district);
  if (state) parts.push(state);
  if (country) parts.push(country);
  // Dedupe preserving order
  return [...new Set(parts)].join(', ');
}

/**
 * Reverse-geocode coordinates via OSM Nominatim (usage-policy friendly:
 * single request per coordinate set, cached, debounced by effect deps).
 * Falls back to farm locality fields, then coordinates.
 */
export function useReverseGeocode(
  lat?: number | null,
  lon?: number | null,
  fallbackLabel?: string | null,
): ReverseGeocodeResult {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<ReverseGeocodeResult['source']>('none');

  useEffect(() => {
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
      setDisplayName(null); setLoading(false); setError(null); setSource('none');
      return;
    }
    const key = cacheKey(lat, lon);
    const cached = readCache(key);
    if (cached) {
      setDisplayName(cached); setLoading(false); setError(null); setSource('cache');
      return;
    }
    let cancelled = false;
    setLoading(true); setError(null);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
      .then(r => { if (!r.ok) throw new Error(`Geocoder returned ${r.status}`); return r.json(); })
      .then((data: any) => {
        if (cancelled) return;
        const name = formatNominatimAddress(data?.address) || data?.display_name || '';
        if (name) {
          writeCache(key, name);
          setDisplayName(name); setSource('nominatim'); setError(null);
        } else if (fallbackLabel) {
          setDisplayName(fallbackLabel); setSource('fallback');
        } else {
          setDisplayName(`${lat.toFixed(4)}, ${lon.toFixed(4)}`); setSource('fallback');
        }
        setLoading(false);
      })
      .catch((e: any) => {
        if (cancelled) return;
        if (fallbackLabel) {
          setDisplayName(fallbackLabel); setSource('fallback');
        } else {
          setDisplayName(`${lat.toFixed(4)}, ${lon.toFixed(4)}`); setSource('fallback');
        }
        setError(e?.name === 'AbortError' ? 'Location lookup timed out.' : 'Location name unavailable.');
        setLoading(false);
      });
    return () => { cancelled = true; clearTimeout(t); ctrl.abort(); };
  }, [lat, lon, fallbackLabel]);

  return { displayName, loading, error, source };
}
