const fs = require('fs');
const path = require('path');

// Load knowledge rules
const irrigationRules = require('../knowledge/irrigation.json').rules;
const weatherRules = require('../knowledge/weatherRules.json').rules;

class DecisionEngine {
  evaluate(farmContext) {
    const recommendations = [];

    // 1. Disease Rules
    if (farmContext.disease?.healthStatus === 'DISEASE_DETECTED') {
      recommendations.push({
        type: 'DISEASE',
        priority: 'HIGH',
        message: `Detected ${farmContext.disease.disease} with ${(farmContext.disease.confidence * 100).toFixed(1)}% confidence. Immediate treatment recommended.`
      });
    }

    // 2. Weather Rules
    // Simple naive evaluation of condition strings for MVP
    if (farmContext.weather) {
      if (farmContext.weather.windSpeed > 20) {
        recommendations.push({
          type: 'WEATHER',
          priority: 'MEDIUM',
          message: 'High winds detected. Delay chemical spraying.'
        });
      }
      if (farmContext.weather.rainExpected) {
        recommendations.push({
          type: 'WEATHER',
          priority: 'MEDIUM',
          message: 'Rain expected. Foliar treatments may wash off.'
        });
      }
      if (farmContext.weather.humidity > 85 && farmContext.weather.temperature > 25) {
        recommendations.push({
          type: 'WEATHER',
          priority: 'HIGH',
          message: 'High fungal risk due to heat and humidity. Increase scouting.'
        });
      }
    }

    // 3. Soil/Irrigation Rules
    if (farmContext.soil) {
      // Mock logic: If we had live soil moisture, we would check it here.
      if (!farmContext.weather?.rainExpected) {
         // recommend regular watering if no rain
         recommendations.push({
          type: 'IRRIGATION',
          priority: 'LOW',
          message: 'No rain expected. Maintain regular irrigation schedule.'
         });
      }
    }

    return recommendations;
  }
}

module.exports = new DecisionEngine();
