// services/weather.js
const fetch = require('node-fetch');

const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;
if (!OPENWEATHER_KEY) {
  console.warn('OPENWEATHER_KEY not set. Weather requests will fail until you set it in .env');
}

/**
 * Get current weather by city name using OpenWeatherMap current weather API.
 * Returns a small object with city, description, temp_celsius, feels_like_celsius, humidity.
 */
async function getCurrentWeatherByCity(city) {
  if (!OPENWEATHER_KEY) throw new Error('OpenWeather API key not configured');

  const q = encodeURIComponent(city);
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${OPENWEATHER_KEY}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Weather API error: ${res.status} ${txt}`);
  }
  const data = await res.json();

  const weather = {
    city: data.name || city,
    description: data.weather && data.weather[0] && data.weather[0].description ? data.weather[0].description : 'No description',
    temp_celsius: Math.round(data.main.temp * 10) / 10,
    feels_like_celsius: Math.round(data.main.feels_like * 10) / 10,
    humidity: data.main.humidity
  };
  return weather;
}

module.exports = { getCurrentWeatherByCity };
