const riskRules = require('../knowledge/riskRules.json');

class RiskEngine {
  calculate(farmContext) {
    let score = 0;

    // Apply risk scoring rules
    if (farmContext.disease?.healthStatus === 'DISEASE_DETECTED') {
      score += riskRules.scoring.disease_detected;
    }

    if (farmContext.weather?.humidity > 85) {
      score += riskRules.scoring.high_humidity;
    }

    if (farmContext.weather?.rainExpected) {
      score += riskRules.scoring.heavy_rain;
    }
    
    if (farmContext.weather?.temperature > 35) {
      score += riskRules.scoring.extreme_temperature;
    }

    // Determine Risk Level
    let riskLevel = 'LOW';
    let alertMessage = riskRules.levels.LOW.description;

    if (score > riskRules.levels.HIGH.threshold) {
      riskLevel = 'HIGH';
      alertMessage = riskRules.levels.HIGH.description;
    } else if (score > riskRules.levels.MEDIUM.threshold) {
      riskLevel = 'MEDIUM';
      alertMessage = riskRules.levels.MEDIUM.description;
    }

    // Cap score at 100
    score = Math.min(score, 100);

    return {
      riskScore: score,
      riskLevel: riskLevel,
      alert: alertMessage
    };
  }
}

module.exports = new RiskEngine();
