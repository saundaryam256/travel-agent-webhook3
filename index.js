require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { WebhookClient } = require('dialogflow-fulfillment');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

app.use(bodyParser.json());

// Root route (health check)
app.get('/', (req, res) => {
res.send('🌍 Dialogflow CX Travel Webhook is running!');
});

// Webhook endpoint for Dialogflow CX
app.post('/webhook', async (req, res) => {
const agent = new WebhookClient({ request: req, response: res });

// Default fallback
function defaultFallback(agent) {
agent.add("Sorry, I didn't get that. Can you rephrase?");
}

// Check Weather intent (CX-compatible)
async function handleCheckWeather(agent) {
// Log all parameters received from Dialogflow CX
console.log("CX parameters received:", req.body?.sessionInfo?.parameters);


const params = req.body?.sessionInfo?.parameters || {};  
const city = params['geo-city'] || params['city'] || '';  

if (!city) {  
  agent.add("Which city would you like the weather for?");  
  return;  
}  

try {  
  // Test weather data (replace with real API later)  
  const w = {  
    city: city,  
    description: "Sunny",  
    temp_celsius: 30,  
    feels_like_celsius: 32,  
    humidity: 60  
  };  

  agent.add(  
    `Weather in ${w.city}: ${w.description}. Temperature: ${w.temp_celsius}°C (feels like ${w.feels_like_celsius}°C). Humidity ${w.humidity}%.`  
  );  
} catch (err) {  
  console.error(err);  
  agent.add("Sorry, I couldn't fetch the weather right now. Try again later.");  
}  


}

// Map intents to handlers
const intentMap = new Map();
intentMap.set('Default Fallback Intent', defaultFallback);
intentMap.set('Check Weather', handleCheckWeather);

await agent.handleRequest(intentMap);
});

// Bind to 0.0.0.0 for Render deployment
app.listen(PORT, '0.0.0.0', () => {
console.log(`Server is running on port ${PORT}`);
});
