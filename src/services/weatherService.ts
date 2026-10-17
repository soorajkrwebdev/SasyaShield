import { WeatherData } from '../types';

// Map WMO Weather interpretation codes (WW) to human descriptions
export function getWeatherCondition(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code >= 61 && code <= 65) return 'Rain Showers';
  if (code >= 71 && code <= 77) return 'Snow Flurries';
  if (code >= 80 && code <= 82) return 'Heavy Rain Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Fair Weather';
}

export interface HyperlocalWeatherResult {
  weather: WeatherData | null;
  error: string | null;
  source: 'Open-Meteo API' | 'Cache' | 'None';
  farmLocationCoordinates?: { lat: number; lon: number };
}

/**
 * Fetch real hyperlocal weather based on exact farm latitude and longitude.
 * No hardcoded fallback coordinates are used.
 */
export async function fetchFarmWeather(
  latitude?: number | null,
  longitude?: number | null
): Promise<HyperlocalWeatherResult> {
  if (
    latitude === undefined ||
    latitude === null ||
    longitude === undefined ||
    longitude === null ||
    isNaN(latitude) ||
    isNaN(longitude)
  ) {
    return {
      weather: null,
      error: 'Add a farm location with valid GPS coordinates to view weather.',
      source: 'None',
    };
  }

  const cacheKey = `sasyashield_weather_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;

  // 15-minute cache
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
        return {
          weather: parsed.data,
          error: null,
          source: 'Cache',
          farmLocationCoordinates: { lat: latitude, lon: longitude },
        };
      }
    }
  } catch {
    // Ignore session storage errors
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto&forecast_days=7`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = await res.json();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const dailyForecast = (data.daily?.time || []).slice(0, 5).map((timeStr: string, idx: number) => {
      const d = new Date(timeStr);
      const dayName = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : dayNames[d.getDay()];
      return {
        date: timeStr,
        dayName,
        maxTemp: Math.round(data.daily.temperature_2m_max[idx]),
        minTemp: Math.round(data.daily.temperature_2m_min[idx]),
        condition: getWeatherCondition(data.daily.weather_code[idx]),
        rainProb: data.daily.precipitation_probability_max[idx] ?? 0,
      };
    });

    const weatherResult: WeatherData = {
      temperature: Math.round(data.current?.temperature_2m ?? 0),
      humidity: Math.round(data.current?.relative_humidity_2m ?? 0),
      precipitation: Number(data.current?.precipitation ?? 0),
      rain: Number(data.current?.rain ?? 0),
      rainProbability: Number(data.daily?.precipitation_probability_max?.[0] ?? 0),
      windSpeed: Math.round(data.current?.wind_speed_10m ?? 0),
      condition: getWeatherCondition(data.current?.weather_code ?? 0),
      isDay: Boolean(data.current?.is_day ?? 1),
      source: 'Open-Meteo API (open-meteo.com) — Farm-location weather forecast',
      fetchedAt: new Date().toISOString(),
      coordinates: { latitude, longitude },
      dailyForecast,
    };

    try {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: weatherResult,
          timestamp: Date.now(),
        })
      );
    } catch {
      // Ignore cache write errors
    }

    return {
      weather: weatherResult,
      error: null,
      source: 'Open-Meteo API',
      farmLocationCoordinates: { lat: latitude, lon: longitude },
    };
  } catch (err: any) {
    console.error('Weather API request error:', err);
    return {
      weather: null,
      error: err.name === 'AbortError' ? 'Weather service timed out.' : 'Unable to retrieve forecast for these coordinates.',
      source: 'None',
      farmLocationCoordinates: { lat: latitude, lon: longitude },
    };
  }
}
