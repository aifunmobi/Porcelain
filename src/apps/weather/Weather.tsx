import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
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

const mockWeatherData: WeatherData = {
  location: 'San Francisco',
  temperature: 68,
  condition: 'Partly Cloudy',
  humidity: 65,
  windSpeed: 12,
  feelsLike: 66,
  high: 72,
  low: 58,
  icon: '⛅',
};

const mockForecast: ForecastDay[] = [
  { day: 'Mon', high: 72, low: 58, icon: '☀️', condition: 'Sunny' },
  { day: 'Tue', high: 70, low: 56, icon: '⛅', condition: 'Partly Cloudy' },
  { day: 'Wed', high: 65, low: 54, icon: '🌧️', condition: 'Rainy' },
  { day: 'Thu', high: 63, low: 52, icon: '🌧️', condition: 'Rainy' },
  { day: 'Fri', high: 68, low: 55, icon: '⛅', condition: 'Partly Cloudy' },
  { day: 'Sat', high: 74, low: 60, icon: '☀️', condition: 'Sunny' },
  { day: 'Sun', high: 76, low: 62, icon: '☀️', condition: 'Sunny' },
];

export const Weather: React.FC<AppProps> = () => {
  const [weather, setWeather] = useState<WeatherData>(mockWeatherData);
  const [forecast] = useState<ForecastDay[]>(mockForecast);
  const [location, setLocation] = useState('San Francisco');
  const [isLoading, setIsLoading] = useState(false);
  const [unit, setUnit] = useState<'F' | 'C'>('F');

  const convertTemp = (temp: number): number => {
    if (unit === 'C') {
      return Math.round((temp - 32) * 5 / 9);
    }
    return temp;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setWeather({
        ...mockWeatherData,
        location,
        temperature: Math.floor(Math.random() * 30) + 50,
      });
      setIsLoading(false);
    }, 500);
  };

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
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Search location..."
        />
        <button type="submit" className="weather__search-button">
          <Icon name="search" size={16} />
        </button>
      </form>

      {isLoading ? (
        <div className="weather__loading">
          <div className="weather__loading-spinner" />
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default Weather;
