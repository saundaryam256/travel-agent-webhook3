require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { WebhookClient } = require('dialogflow-fulfillment');

const weatherService = require('./services/weather');
const flightService = require('./services/flights');

const app = express();
// ✅ Correct PORT fallback for Render
const PORT = parseInt(process.env.PORT, 10) || 3000;

app.use(bodyParser.json());

// Root route (health check)
app.get('/', (req, res) => {
res.send('🌍 Dialogflow Travel Webhook is running!');
});

// Webhook endpoint for Dialogflow
app.post('/webhook', async (req, res) => {
const agent = new WebhookClient({ request: req, response: res });

// Default fallback
function defaultFallback(agent) {
agent.add("Sorry, I didn't get that. Can you rephrase?");
}

// Check Weather intent
async function handleCheckWeather(agent) {
const params = agent.parameters || {};
const city = params['geo-city'] || params['place'] || params['city'] || '';


if (!city) {  
  agent.add("Which city would you like the weather for?");  
  return;  
}  

try {  
  const w = await weatherService.getCurrentWeatherByCity(city);  
  agent.add(
    "Weather in " + w.city +
    ": " + w.description +
    ". Temperature: " + w.temp_celsius + "°C (feels like " + w.feels_like_celsius + "°C). Humidity " + w.humidity + "%."
  );  
} catch (err) {  
  console.error(err);  
  agent.add("Sorry, I couldn't fetch the weather right now. Try again later.");  
}  


}

// Intent map
let intentMap = new Map();
intentMap.set('Default Fallback Intent', defaultFallback);
intentMap.set('Check Weather', handleCheckWeather);

agent.handleRequest(intentMap);
});

// Bind to 0.0.0.0 for Render deployment
app.listen(PORT, '0.0.0.0', () => {
console.log(`Server is running on port ${PORT}`);
});
