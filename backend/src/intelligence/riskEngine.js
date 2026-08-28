const riskRules = require('../knowledge/riskRules.json');

/**
 * Risk Engine
 *
 * Scores by ADDING points for hazardous conditions. That makes a missing input
 * dangerous: with weather unavailable, no weather points are added and the
 * score comes out low, which reads to a farmer as "you are fine". So the engine
 * tracks which signals it actually saw and reports PARTIAL when any are absent,
 * rather than presenting a falsely reassuring number.
 */

class RiskEngine {
  calculate(farmContext) {
    let score = 0;
    const applied = [];
    const missing = [];

    const disease = farmContext.disease;
    const weather = farmContext.weather;
    const history = farmContext.history;

    // --- Disease ---------------------------------------------------------
    if (disease?.status === 'SUCCESS') {
      if (disease.healthStatus === 'DISEASE_DETECTED') {
        score += riskRules.scoring.disease_detected;
        applied.push('disease_detected');
      }
    } else {
      missing.push('disease');
    }

    // --- Weather ---------------------------------------------------------
    if (weather?.status === 'OK') {
      if (weather.humidity != null && weather.humidity > 85) {
        score += riskRules.scoring.high_humidity;
        applied.push('high_humidity');
      }
      if (weather.rainExpected) {
        score += riskRules.scoring.heavy_rain;
        applied.push('heavy_rain');
      }
      if (weather.temperature != null && weather.temperature > 35) {
        score += riskRules.scoring.extreme_temperature;
        applied.push('extreme_temperature');
      }
    } else {
      missing.push('weather');
    }

    // --- History (defined in riskRules.json but previously never applied) --
    if (Array.isArray(history)) {
      const priorDisease = history.some(
        (scan) => scan?.risk_level === 'HIGH' || (scan?.disease && scan.disease !== 'NOT_A_CROP')
      );
      if (priorDisease) {
        score += riskRules.scoring.history_of_disease;
        applied.push('history_of_disease');
      }
    } else {
      missing.push('history');
    }

    score = Math.min(score, 100);

    // Thresholds in riskRules.json are band MINIMUMS, so compare with >=.
    let riskLevel = 'LOW';
    let alert = riskRules.levels.LOW.description;

    if (score >= riskRules.levels.HIGH.threshold) {
      riskLevel = 'HIGH';
      alert = riskRules.levels.HIGH.description;
    } else if (score >= riskRules.levels.MEDIUM.threshold) {
      riskLevel = 'MEDIUM';
      alert = riskRules.levels.MEDIUM.description;
    }

    const complete = missing.length === 0;
    if (!complete) {
      alert = `${alert} (Based on partial information - ${missing.join(', ')} unavailable, so actual risk may be higher.)`;
    }

    return {
      riskScore: score,
      riskLevel,
      alert,
      confidence: complete ? 'FULL' : 'PARTIAL',
      signalsApplied: applied,
      signalsMissing: missing
    };
  }
}

module.exports = new RiskEngine();
