import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import { useAppCommands } from '../../hooks/useAppCommands';
import './Weather.css';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  high: number;
  low: number;
  icon: string;
}

interface ForecastDay {
  day: string;
  high: number;
  low: number;
  icon: string;
  condition: string;
}

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

// Weather code to icon/condition mapping
const getWeatherInfo = (code: number): { icon: string; condition: string } => {
  const weatherMap: { [key: number]: { icon: string; condition: string } } = {
    0: { icon: '☀️', condition: 'Clear sky' },
    1: { icon: '🌤️', condition: 'Mainly clear' },
    2: { icon: '⛅', condition: 'Partly cloudy' },
    3: { icon: '☁️', condition: 'Overcast' },
    45: { icon: '🌫️', condition: 'Fog' },
    48: { icon: '🌫️', condition: 'Depositing rime fog' },
    51: { icon: '🌦️', condition: 'Light drizzle' },
    53: { icon: '🌦️', condition: 'Moderate drizzle' },
    55: { icon: '🌦️', condition: 'Dense drizzle' },
    56: { icon: '🌨️', condition: 'Light freezing drizzle' },
    57: { icon: '🌨️', condition: 'Dense freezing drizzle' },
    61: { icon: '🌧️', condition: 'Slight rain' },
    63: { icon: '🌧️', condition: 'Moderate rain' },
    65: { icon: '🌧️', condition: 'Heavy rain' },
    66: { icon: '🌨️', condition: 'Light freezing rain' },
    67: { icon: '🌨️', condition: 'Heavy freezing rain' },
    71: { icon: '❄️', condition: 'Slight snow' },
    73: { icon: '❄️', condition: 'Moderate snow' },
    75: { icon: '❄️', condition: 'Heavy snow' },
    77: { icon: '❄️', condition: 'Snow grains' },
    80: { icon: '🌦️', condition: 'Slight rain showers' },
    81: { icon: '🌧️', condition: 'Moderate rain showers' },
    82: { icon: '⛈️', condition: 'Violent rain showers' },
    85: { icon: '🌨️', condition: 'Slight snow showers' },
    86: { icon: '🌨️', condition: 'Heavy snow showers' },
    95: { icon: '⛈️', condition: 'Thunderstorm' },
    96: { icon: '⛈️', condition: 'Thunderstorm with slight hail' },
    99: { icon: '⛈️', condition: 'Thunderstorm with heavy hail' },
  };
  return weatherMap[code] || { icon: '🌡️', condition: 'Unknown' };
};

const getDayName = (dateStr: string): string => {
  // A bare "YYYY-MM-DD" parses as UTC midnight, which is the previous evening
  // anywhere west of Greenwich. Adding a time makes it local.
  const date = new Date(`${dateStr}T00:00:00`);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

export const Weather: React.FC<AppProps> = ({ windowId }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [, setDisplayLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<'F' | 'C'>('F');
  // Responses are only applied if they belong to the latest request, so a
  // slow geolocation lookup cannot overwrite a search made in the meantime.
  const requestIdRef = useRef(0);
  const beginRequest = () => ++requestIdRef.current;

  const convertTemp = (temp: number): number => {
    if (unit === 'C') {
      return Math.round(temp);
    }
    // Convert from Celsius to Fahrenheit
    return Math.round((temp * 9/5) + 32);
  };

  const fetchWeatherByCoords = useCallback(async (lat: number, lon: number, locationName: string, requestId = beginRequest()) => {
    if (requestId !== requestIdRef.current) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch weather data from Open-Meteo API
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

      const response = await fetch(weatherUrl);
      if (!response.ok) throw new Error('Failed to fetch weather data');

      const data = await response.json();
      if (requestId !== requestIdRef.current) return;

      const currentWeatherInfo = getWeatherInfo(data.current.weather_code);

      setWeather({
        location: locationName,
        temperature: data.current.temperature_2m,
        condition: currentWeatherInfo.condition,
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m * 0.621371), // km/h to mph
        feelsLike: data.current.apparent_temperature,
        high: data.daily.temperature_2m_max[0],
        low: data.daily.temperature_2m_min[0],
        icon: currentWeatherInfo.icon,
      });

      // Parse forecast
      const forecastDays: ForecastDay[] = data.daily.time.slice(0, 7).map((date: string, i: number) => {
        const info = getWeatherInfo(data.daily.weather_code[i]);
        return {
          day: getDayName(date),
          high: data.daily.temperature_2m_max[i],
          low: data.daily.temperature_2m_min[i],
          icon: info.icon,
          condition: info.condition,
        };
      });

      setForecast(forecastDays);
      setDisplayLocation(locationName);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Weather fetch error:', err);
      setError('Failed to load weather data');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) return;

    const requestId = beginRequest();
    setIsLoading(true);
    setError(null);

    try {
      // Use Open-Meteo Geocoding API
      const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;

      const response = await fetch(geocodeUrl);
      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      if (requestId !== requestIdRef.current) return;

      if (!data.results || data.results.length === 0) {
        setError(`Location "${query}" not found`);
        setIsLoading(false);
        return;
      }

      const result: GeocodingResult = data.results[0];
      const locationName = result.admin1
        ? `${result.name}, ${result.admin1}`
        : `${result.name}, ${result.country}`;

      await fetchWeatherByCoords(result.latitude, result.longitude, locationName, requestId);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Search error:', err);
      setError('Failed to search location');
      setIsLoading(false);
    }
  }, [fetchWeatherByCoords]);

  // Get user's location on mount
  useEffect(() => {
    const requestIds = requestIdRef;
    const getLocation = async () => {
      // Try to get user's location
      if (navigator.geolocation) {
        const requestId = beginRequest();
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            // Open-Meteo doesn't have reverse geocoding, so we'll just use coords
            await fetchWeatherByCoords(latitude, longitude, 'Current Location', requestId);
          },
          () => {
            // Location denied, default to New York — unless a search already won.
            if (requestId === requestIds.current) searchLocation('New York');
          },
          { timeout: 5000 }
        );
      } else {
        // Geolocation not supported, default to New York
        searchLocation('New York');
      }
    };

    getLocation();
    return () => {
      // Anything still in flight belongs to an unmounted window.
      requestIds.current++;
    };
  }, [fetchWeatherByCoords, searchLocation]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      searchLocation(searchInput.trim());
    }
  };

  useAppCommands(
    windowId,
    useMemo(
      // Refresh re-runs the search for wherever we are showing.
      () => ({
        refresh: weather?.location ? () => void searchLocation(weather.location) : undefined,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [weather?.location]
    )
  );

  const toggleUnit = () => {
    setUnit(unit === 'F' ? 'C' : 'F');
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="weather">
      {/* Search Bar */}
      <form className="weather__search" onSubmit={handleSearch}>
        <input
          type="text"
          className="weather__search-input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search city..."
        />
        <button type="submit" className="weather__search-button is-primary">
          <Icon name="search" size={16} />
        </button>
      </form>

      {isLoading ? (
        <div className="weather__loading">
          <div className="weather__loading-spinner" />
          <p>Loading weather...</p>
        </div>
      ) : error ? (
        <div className="weather__error">
          <Icon name="alert" size={48} />
          <p>{error}</p>
          <button onClick={() => searchLocation('New York')} className="weather__retry-btn">
            Try New York
          </button>
        </div>
      ) : weather ? (
        <>
          {/* Current Weather */}
          <div className="weather__current">
            <div className="weather__location">
              <h2 className="weather__city">{weather.location}</h2>
              <span className="weather__time">{currentTime}</span>
            </div>

            <div className="weather__main">
              <span className="weather__icon">{weather.icon}</span>
              <div className="weather__temp-container">
                <span className="weather__temp">
                  {convertTemp(weather.temperature)}°
                </span>
                <button className="weather__unit-toggle" onClick={toggleUnit}>
                  {unit}
                </button>
              </div>
            </div>

            <p className="weather__condition">{weather.condition}</p>

            <div className="weather__details">
              <div className="weather__detail">
                <span className="weather__detail-label">Feels like</span>
                <span className="weather__detail-value">
                  {convertTemp(weather.feelsLike)}°
                </span>
              </div>
              <div className="weather__detail">
                <span className="weather__detail-label">Humidity</span>
                <span className="weather__detail-value">{weather.humidity}%</span>
              </div>
              <div className="weather__detail">
                <span className="weather__detail-label">Wind</span>
                <span className="weather__detail-value">{weather.windSpeed} mph</span>
              </div>
              <div className="weather__detail">
                <span className="weather__detail-label">H / L</span>
                <span className="weather__detail-value">
                  {convertTemp(weather.high)}° / {convertTemp(weather.low)}°
                </span>
              </div>
            </div>
          </div>

          {/* Forecast */}
          <div className="weather__forecast">
            <h3 className="weather__forecast-title">7-Day Forecast</h3>
            <div className="weather__forecast-list">
              {forecast.map((day, index) => (
                <div key={index} className="weather__forecast-day">
                  <span className="weather__forecast-name">{day.day}</span>
                  <span className="weather__forecast-icon">{day.icon}</span>
                  <span className="weather__forecast-temps">
                    <span className="weather__forecast-high">
                      {convertTemp(day.high)}°
                    </span>
                    <span className="weather__forecast-low">
                      {convertTemp(day.low)}°
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Weather;
