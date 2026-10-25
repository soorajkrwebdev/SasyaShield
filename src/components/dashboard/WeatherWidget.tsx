import React from 'react';
import { useWeather } from '../../hooks/useWeather';
import { Droplets, Wind, CloudRain } from 'lucide-react';
import { Farm } from '../../types';

interface WeatherWidgetProps {
  farm?: Farm | null;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ farm }) => {
  const { weather, loading } = useWeather(farm?.latitude, farm?.longitude);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-md animate-pulse">
        <div className="h-4 bg-emerald-700/50 rounded w-1/3 mb-4" />
        <div className="h-10 bg-emerald-700/50 rounded w-1/2 mb-6" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 bg-emerald-700/40 rounded-xl" />
          <div className="h-12 bg-emerald-700/40 rounded-xl" />
          <div className="h-12 bg-emerald-700/40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!weather) return null;

  // Agricultural advisory based on rainfall and temp
  const getAgriWeatherAdvisory = () => {
    const rainNextDays = weather.dailyForecast.some(d => d.rainProb > 50);
    if (weather.precipitation > 2 || rainNextDays) {
      return 'Rain forecast detected: ensure drainage channels are cleared; avoid foliar botanical sprays until clear sky returns.';
    }
    if (weather.temperature > 34) {
      return 'High temperatures: maintain soil mulch layers to curb evapotranspiration; irrigate during early morning or late evening.';
    }
    return 'Favorable conditions: ideal window for vermicompost application, biofertilizer inoculation, and light intercultural weeding.';
  };

  return (
    <div className="bg-gradient-to-br from-emerald-900 via-emerald-850 to-teal-950 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border border-emerald-700/30">
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top row: Farm & condition */}
      <div className="flex flex-wrap items-start justify-between gap-2 relative z-10">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90 block">
            Hyperlocal Weather & Agronomic Advisory
          </span>
          <h4 className="text-sm font-semibold text-emerald-100 mt-0.5 truncate max-w-full sm:max-w-xs">
            {farm ? farm.name : 'Regional Agriculture Forecast'}
          </h4>
        </div>
        <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/40 text-emerald-200 whitespace-nowrap">
          {weather.condition}
        </span>
      </div>

      {/* Main Temperature & Key Metrics */}
      <div className="my-5 flex flex-col gap-4 relative z-10">
        {/* Left: Temperature + Feels like */}
        <div className="flex min-w-0 flex-wrap items-baseline gap-3">
          <span className="text-4xl sm:text-4xl font-extrabold tracking-tight font-heading shrink-0">
            {weather.temperature}°C
          </span>
          <div className="min-w-0 text-xs text-emerald-200/80">
            <p className="flex flex-wrap items-baseline gap-1">
              Feels like <span className="font-semibold">{weather.temperature + 1}°C</span>
            </p>
            <p className="text-[11px] text-emerald-300/70 break-words">
              {farm?.location || 'Western Ghats / Peninsular India'}
            </p>
          </div>
        </div>

        {/* Right: three metric cards */}
        <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-3 sm:gap-3 sm:text-sm">
          <div>
            <Droplets className="w-4 h-4 mx-auto text-emerald-300 mb-1.5" />
            <span className="block text-[10px] text-emerald-200 uppercase font-bold whitespace-nowrap">
              HUMIDITY
            </span>
            <span className="font-bold text-white text-sm whitespace-nowrap">
              {weather.humidity}%
            </span>
          </div>
          <div>
            <CloudRain className="w-4 h-4 mx-auto text-sky-300 mb-1.5" />
            <span className="block text-[10px] text-emerald-200 uppercase font-bold whitespace-nowrap">
              RAIN
            </span>
            <span className="font-bold text-white text-sm whitespace-nowrap">
              {weather.precipitation} mm
            </span>
          </div>
          <div>
            <Wind className="w-4 h-4 mx-auto text-teal-300 mb-1.5" />
            <span className="block text-[10px] text-emerald-200 uppercase font-bold whitespace-nowrap">
              WIND
            </span>
            <span className="font-bold text-white text-sm whitespace-nowrap">
              {weather.windSpeed} km/h
            </span>
          </div>
        </div>
      </div>

      {/* Agronomic advisory note */}
      <div className="bg-emerald-950/70 border border-emerald-700/40 rounded-2xl p-3 text-xs text-emerald-100/90 leading-relaxed mb-4 relative z-10">
        <span className="font-bold text-emerald-300 mr-1.5">Agronomy Alert:</span>
        {getAgriWeatherAdvisory()}
      </div>

      {/* 4-Day Forecast Strip */}
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-emerald-800/60 relative z-10">
        {weather.dailyForecast.map((day, idx) => (
          <div key={idx} className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
            <span className="block text-[10px] font-bold text-emerald-200 uppercase">{day.dayName}</span>
            <span className="block text-xs font-bold text-white my-0.5">{day.maxTemp}° / {day.minTemp}°</span>
            <span className="block text-[9px] text-emerald-300/80 truncate">{day.condition}</span>
            <span className="inline-block text-[9px] font-semibold text-sky-300 mt-0.5">
              🌧 {day.rainProb}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
