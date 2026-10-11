import React, { useEffect, useMemo, useState } from 'react';
import { useFarmData } from '../../contexts/FarmContext';
import { useWeather } from '../../hooks/useWeather';
import { useReverseGeocode } from '../../hooks/useReverseGeocode';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  MapPin,
  Droplets,
  Wind,
  CloudRain,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  Navigation,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Agricultural context hints
// These are general contextual observations — NOT commands or diagnoses.
// They are triggered by weather thresholds and are purely informational.
// ─────────────────────────────────────────────────────────────────────────────
interface ContextHint {
  level: 'info' | 'caution' | 'ok';
  message: string;
}

function getAgriculturalHints(
  precipitation: number,
  rainProbability: number,
  humidity: number,
  windSpeed: number,
  temperature: number,
): ContextHint[] {
  const hints: ContextHint[] = [];

  if (rainProbability >= 70) {
    hints.push({
      level: 'caution',
      message:
        `Forecast indicates ${rainProbability}% rain probability today. ` +
        'Consider checking crops susceptible to fungal conditions if this is a pattern over multiple days.',
    });
  }

  if (precipitation > 5) {
    hints.push({
      level: 'caution',
      message:
        `Significant recent precipitation (${precipitation} mm). ` +
        'If drainage in crop basins is inadequate, it may be worth inspecting for waterlogging.',
    });
  }

  if (humidity >= 85) {
    hints.push({
      level: 'caution',
      message:
        `Relative humidity is ${humidity}%. Prolonged high humidity is associated with conditions ` +
        'that can support foliar disease development in some crops — consider scouting.',
    });
  } else if (humidity >= 70 && humidity < 85) {
    hints.push({
      level: 'info',
      message: `Humidity at ${humidity}%. Conditions are within a moderate range for most plantation crops.`,
    });
  }

  if (temperature >= 38) {
    hints.push({
      level: 'caution',
      message:
        `High temperature (${temperature}°C). Consider checking soil moisture near young plants ` +
        'and whether irrigation timing should be adjusted to early morning or evening.',
    });
  } else if (temperature <= 15) {
    hints.push({
      level: 'info',
      message:
        `Temperature is relatively low (${temperature}°C). ` +
        'Activity of some soil organisms and beneficial insects may slow at lower temperatures.',
    });
  }

  if (windSpeed >= 30) {
    hints.push({
      level: 'caution',
      message:
        `Wind speed is ${windSpeed} km/h. Foliar spraying is generally not recommended in windy conditions ` +
        'due to drift — consider postponing any scheduled applications.',
    });
  }

  if (hints.length === 0) {
    hints.push({
      level: 'ok',
      message:
        'Current forecast conditions appear generally suitable for routine farm activities. ' +
        'Always verify with your own field observations.',
    });
  }

  return hints;
}

export const WeatherPage: React.FC = () => {
  const { selectedFarm, farms, loading: farmDataLoading } = useFarmData();

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationSource, setLocationSource] = useState<'farm' | 'device' | 'none'>('none');
  const [locationStatus, setLocationStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [locationError, setLocationError] = useState('');
  const [isRequestingDeviceLocation, setIsRequestingDeviceLocation] = useState(false);

  // Synchronize location whenever selectedFarm changes or loads.
  // Capture the coords outside the effect to keep deps stable.
  const farmLat = selectedFarm?.latitude ?? null;
  const farmLng = selectedFarm?.longitude ?? null;
  const farmId  = selectedFarm?.id ?? null;

  useEffect(() => {
    // If farm context is still loading, wait
    if (farmDataLoading) {
      setLocationStatus('loading');
      return;
    }

    const hasValidCoords =
      farmId !== null &&
      typeof farmLat === 'number' &&
      typeof farmLng === 'number' &&
      !isNaN(farmLat) &&
      !isNaN(farmLng);

    if (hasValidCoords) {
      setCoords({
        latitude: farmLat as number,
        longitude: farmLng as number,
      });
      setLocationSource('farm');
      setLocationStatus('ready');
      setLocationError('');
    } else {
      // Clear previous coords so stale weather from an earlier farm is never shown
      setCoords(null);
      setLocationSource('none');
      setLocationStatus('missing');
      setLocationError('');
    }
  }, [farmId, farmLat, farmLng, farmDataLoading]);

  const handleRequestDeviceLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setIsRequestingDeviceLocation(true);
    setLocationStatus('loading');
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      position => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationSource('device');
        setLocationStatus('ready');
        setLocationError('');
        setIsRequestingDeviceLocation(false);
      },
      error => {
        setIsRequestingDeviceLocation(false);
        setLocationStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Device location permission was denied. You can edit your farm settings to add GPS coordinates, or allow location access in your browser settings.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Current device location is unavailable right now. Please verify your connection or GPS settings.');
        } else {
          setLocationError('Unable to determine device location. Please try again or add coordinates to your farm.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  };

  const { weather, loading: weatherLoading, error: weatherError } = useWeather(
    coords?.latitude,
    coords?.longitude,
  );

  // Readable locality for the active coordinates (cached Nominatim lookup).
  // Weather fetching still uses raw coordinates — the label never affects it.
  const farmLocalityFallback = useMemo(() => {
    if (locationSource !== 'farm' || !selectedFarm) return null;
    const parts = [selectedFarm.location].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : selectedFarm.name;
  }, [locationSource, selectedFarm]);
  const {
    displayName: localityName,
    loading: localityLoading,
  } = useReverseGeocode(coords?.latitude, coords?.longitude, farmLocalityFallback);

  const hints = weather
    ? getAgriculturalHints(
        weather.precipitation,
        weather.rainProbability,
        weather.humidity,
        weather.windSpeed,
        weather.temperature,
      )
    : [];

  const hintColors: Record<ContextHint['level'], string> = {
    ok: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    caution: 'bg-amber-50 border-amber-200 text-amber-900',
  };

  const hintIcons: Record<ContextHint['level'], React.ReactNode> = {
    ok: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
    caution: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
  };

  const pageTitle = locationSource === 'farm' && selectedFarm
    ? `Weather for ${selectedFarm.name}`
    : locationSource === 'device'
      ? 'Weather at Your Device Location'
      : 'Hyperlocal Agricultural Weather';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{pageTitle}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {locationSource === 'farm' && selectedFarm
              ? `Live hyperlocal forecast via Open-Meteo API for ${selectedFarm.name}`
              : 'Live agricultural weather forecast and agronomic advisories via Open-Meteo API'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">Open-Meteo</Badge>
          <a
            href="https://open-meteo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-400 hover:text-emerald-600 flex items-center gap-0.5"
          >
            open-meteo.com <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
        {locationStatus === 'loading' && (
          <div className="flex items-center justify-center gap-3 min-h-[96px] text-slate-600">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">
              {isRequestingDeviceLocation ? 'Requesting device location...' : 'Resolving farm coordinates...'}
            </span>
          </div>
        )}

        {locationStatus === 'missing' && (
          <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-6 text-center">
            <MapPin className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h3 className="font-semibold text-amber-900 mb-1">
              {farms.length === 0
                ? 'No farm created yet'
                : selectedFarm
                  ? `No coordinates saved for ${selectedFarm.name}`
                  : 'No active farm selected'}
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 max-w-lg mx-auto mb-4 leading-relaxed">
              {farms.length === 0
                ? 'Create a farm with latitude and longitude to view hyperlocal weather automatically.'
                : selectedFarm
                  ? `"${selectedFarm.name}" does not have saved GPS coordinates. Add coordinates in farm settings, or check weather using your current device location.`
                  : 'Select an active farm with GPS coordinates to view hyperlocal weather.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestDeviceLocation}
              icon={<Navigation className="w-3.5 h-3.5 text-emerald-600" />}
              className="bg-white border-amber-300 text-amber-950 hover:bg-amber-100/50"
            >
              Use My Current Location
            </Button>
          </div>
        )}

        {locationStatus === 'error' && (
          <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <h3 className="font-semibold text-rose-900 mb-1">Unable to acquire location</h3>
            <p className="text-xs sm:text-sm text-rose-700 max-w-lg mx-auto mb-4">{locationError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestDeviceLocation}
              className="bg-white border-rose-300 text-rose-800 hover:bg-rose-100/50"
            >
              Try Device Location Again
            </Button>
          </div>
        )}

        {locationStatus === 'ready' && coords && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-slate-600">
            <div className="flex items-start gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="min-w-0">
                {locationSource === 'farm' && selectedFarm ? (
                  <>
                    <span className="block font-semibold text-slate-800 break-words">
                      {selectedFarm.name}
                    </span>
                    <span className="block text-slate-600 break-words">
                      {localityLoading ? (
                        'Resolving location name…'
                      ) : localityName ? (
                        localityName
                      ) : (
                        farmLocalityFallback || 'Location name unavailable'
                      )}
                    </span>
                  </>
                ) : (
                  <span className="block font-semibold text-slate-800 break-words">
                    {localityLoading
                      ? 'Resolving your location…'
                      : localityName || 'Device Location'}
                  </span>
                )}
              </span>
              <span className="text-slate-400 shrink-0">·</span>
              <span className="font-medium text-slate-500 text-xs shrink-0" title="Technical coordinates used for the Open-Meteo forecast">
                {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
              </span>
            </div>

            {locationSource === 'farm' && (
              <button
                type="button"
                onClick={handleRequestDeviceLocation}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                <span>Use device location instead</span>
              </button>
            )}

            {locationSource === 'device' && selectedFarm && typeof selectedFarm.latitude === 'number' && typeof selectedFarm.longitude === 'number' && (
              <button
                type="button"
                onClick={() => {
                  setCoords({
                    latitude: selectedFarm.latitude as number,
                    longitude: selectedFarm.longitude as number,
                  });
                  setLocationSource('farm');
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <MapPin className="w-3 h-3" />
                <span>Switch back to {selectedFarm.name}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {coords && weatherLoading && (
        <div className="bg-white rounded-2xl border p-10 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {locationSource === 'farm' && selectedFarm
              ? `Fetching hyperlocal weather for ${selectedFarm.name}...`
              : 'Fetching weather for coordinates...'}
          </p>
        </div>
      )}

      {coords && !weatherLoading && weatherError && (
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="font-semibold text-rose-900 mb-1">Unable to load forecast</h3>
          <p className="text-sm text-rose-700 max-w-sm mx-auto">{weatherError}</p>
        </div>
      )}

      {coords && !weatherLoading && weather && (
        <>
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-3xl p-6 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-300/90 tracking-wider">
                  Current Conditions
                </span>
                <h3 className="text-base font-bold text-emerald-50 mt-0.5">
                  {locationSource === 'farm' && selectedFarm
                    ? selectedFarm.name
                    : 'Current Location'}
                </h3>
                <p className="text-[10px] text-emerald-400 mt-0.5">
                  Lat: {coords.latitude.toFixed(4)}, Lon: {coords.longitude.toFixed(4)}
                  {locationSource === 'farm' && selectedFarm?.location ? ` • ${selectedFarm.location}` : ''}
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-800/80 border border-emerald-700/60">
                {weather.condition}
              </span>
            </div>

            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <span className="text-5xl font-extrabold">{weather.temperature}°C</span>
                <span className="text-sm text-emerald-200/70 ml-2">
                  {weather.isDay ? 'Daytime' : 'Night-time'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                  <Droplets className="w-4 h-4 text-emerald-300 mx-auto mb-1" />
                  <span className="text-[10px] text-emerald-200 uppercase font-bold block">Humidity</span>
                  <span className="block font-bold text-white text-sm">{weather.humidity}%</span>
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                  <CloudRain className="w-4 h-4 text-sky-300 mx-auto mb-1" />
                  <span className="text-[10px] text-emerald-200 uppercase font-bold block">Rain prob.</span>
                  <span className="block font-bold text-white text-sm">{weather.rainProbability}%</span>
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                  <Wind className="w-4 h-4 text-teal-300 mx-auto mb-1" />
                  <span className="text-[10px] text-emerald-200 uppercase font-bold block">Wind</span>
                  <span className="block font-bold text-white text-sm">{weather.windSpeed} km/h</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-emerald-400/70 mt-4 border-t border-white/10 pt-3">
              Source: {weather.source} · Retrieved: {new Date(weather.fetchedAt).toLocaleTimeString()}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            <h4 className="font-bold text-slate-800 text-sm mb-3">5-Day Forecast</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {weather.dailyForecast.map((day, idx) => (
                <div
                  key={idx}
                  className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    {day.dayName}
                  </span>
                  <span className="block text-base font-bold text-slate-800 my-1">
                    {day.maxTemp}° / {day.minTemp}°
                  </span>
                  <span className="text-[10px] text-slate-500 block">{day.condition}</span>
                  <span className="text-[10px] font-semibold text-sky-600 block">
                    {day.rainProb}% rain
                  </span>
                  {day.precipitationSum != null && day.precipitationSum > 0 && (
                    <span className="text-[10px] text-sky-500 block">{day.precipitationSum} mm</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm">Agricultural Context</h4>
              <span className="text-[10px] text-slate-400 font-medium">
                Observations only — not farm commands
              </span>
            </div>

            {hints.map((hint, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 p-3 rounded-xl border text-xs leading-relaxed ${hintColors[hint.level]}`}
              >
                {hintIcons[hint.level]}
                <span>{hint.message}</span>
              </div>
            ))}

            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
              These are general observations based on forecast thresholds. They are not crop-specific
              diagnoses or recommendations. Always verify with your own field scouting.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
