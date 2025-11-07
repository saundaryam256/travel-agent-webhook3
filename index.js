// index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { WebhookClient } = require('dialogflow-fulfillment');

const weatherService = require('./services/weather');
const flightService = require('./services/flights');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  // Default fallback handler
  function defaultFallback(agent) {
    agent.add("Sorry, I didn't get that. Can you rephrase?");
  }

  // Check_Weather intent handler
  async function handleCheckWeather(agent) {
    const params = agent.parameters || {};
    const city = params['geo-city'] || params['place'] || params['city'] || '';

    if (!city) {
      agent.add("Which city would you like the weather for?");
      return;
    }

    try {
      const w = await weatherService.getCurrentWeatherByCity(city);
      agent.add(`Weather in ${w.city}: ${w.description}. Temperature: ${w.temp_celsius}°C (feels like ${w.feels_like_celsius}°C). Humidity ${w.humidity}%.`);
    } catch (err) {
      console.error('Weather error', err);
      agent.add("Sorry, I couldn't fetch the weather right now. Please try again later.");
    }
  }

  // Book_Flight intent handler
  async function handleBookFlight(agent) {
    const params = agent.parameters || {};
    const origin = params['origin'] || params['from'] || params['place-from'] || params['city-from'] || params['place'];
    const destination = params['destination'] || params['to'] || params['place-to'] || params['city-to'];
    const departDate = params['date'] || params['travel_date'] || params['date-period'] || '';
    const travelClass = params['flight-class'] || params['travel_class'] || 'economy';

    if (!origin || !destination) {
      agent.add("Please tell me the origin and destination city (e.g., from Mumbai to Delhi).");
      return;
    }

    try {
      const flights = await flightService.searchFlights({ origin, destination, date: departDate, travelClass });
      if (!flights || flights.length === 0) {
        agent.add(`I couldn't find flights from ${origin} to ${destination}. Try another date or cities.`);
        return;
      }

      const top = flights.slice(0, 3);
      let reply = `Here are the top ${top.length} flights from ${origin} to ${destination}:\n`;
      top.forEach((f, i) => {
        reply += `\n${i + 1}. ${f.airline} ${f.flight_no} — Departure: ${f.departure_time} Arrival: ${f.arrival_time} — Price: ${f.price || 'N/A'} ${f.currency || ''}`;
      });
      agent.add(reply);
    } catch (err) {
      console.error('Flight search error', err);
      agent.add("Sorry, I couldn't search flights right now. Please try again later.");
    }
  }

  // Map intents
  let intentMap = new Map();
  intentMap.set('Default Fallback Intent', defaultFallback);
  intentMap.set('Default Welcome Intent', (agent) => agent.add('Hi! I am your travel assistant. How can I help?'));
  intentMap.set('Check_Weather', handleCheckWeather);
  intentMap.set('Book_Flight', handleBookFlight);

  try {
    await agent.handleRequest(intentMap);
  } catch (err) {
    console.error('handleRequest error', err);
    res.status(500).send('Server error');
  }
});

// Health check
app.get('/', (req, res) => res.send('Dialogflow webhook running.'));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log("✅ Dialogflow Travel Webhook is running successfully!");
});
