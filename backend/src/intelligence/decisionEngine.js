const irrigationRules = require('../knowledge/irrigation.json').rules;
const weatherRules = require('../knowledge/weatherRules.json').rules;

/**
 * Decision Engine
 *
 * Rules whose inputs are unavailable are SKIPPED, not evaluated against
 * defaults. Advice derived from a missing reading is worse than no advice.
 */

class DecisionEngine {
  evaluate(farmContext) {
    const recommendations = [];
    const skipped = [];

    const disease = farmContext.disease;
    const weather = farmContext.weather;
    const soil = farmContext.soil;

    // --- Disease ---------------------------------------------------------
    if (disease?.status === 'SUCCESS' && disease.healthStatus === 'DISEASE_DETECTED') {
      const confidence = (disease.confidence ?? 0) * 100;
      recommendations.push({
        type: 'DISEASE',
        priority: 'HIGH',
        ruleId: 'disease_001',
        message: `Detected ${disease.disease} with ${confidence.toFixed(1)}% confidence. Immediate treatment recommended.`
      });
    } else if (disease?.status === 'ABSTAINED') {
      recommendations.push({
        type: 'DISEASE',
        priority: 'MEDIUM',
        ruleId: 'disease_abstain',
        message: disease.message
          || 'The photo was not clear enough to identify a disease. Please retake it in good light with one leaf filling the frame.'
      });
    } else if (disease?.status === 'UNAVAILABLE') {
      skipped.push('disease');
    }

    // --- Weather ---------------------------------------------------------
    if (weather?.status === 'OK') {
      const windRule = weatherRules.find((r) => r.id === 'weather_001');
      if (weather.windSpeed != null && weather.windSpeed > 20) {
        recommendations.push({
          type: 'WEATHER', priority: 'MEDIUM', ruleId: windRule.id,
          message: `${windRule.hazard}: ${windRule.advice}`
        });
      }

      const rainRule = weatherRules.find((r) => r.id === 'weather_003');
      if (weather.rainExpected) {
        recommendations.push({
          type: 'WEATHER', priority: 'MEDIUM', ruleId: rainRule.id,
          message: `${rainRule.hazard}: ${rainRule.advice}`
        });
      }

      const fungalRule = weatherRules.find((r) => r.id === 'weather_002');
      if (
        weather.humidity != null && weather.humidity > 85 &&
        weather.temperature != null && weather.temperature > 25
      ) {
        recommendations.push({
          type: 'WEATHER', priority: 'HIGH', ruleId: fungalRule.id,
          message: `${fungalRule.hazard}: ${fungalRule.advice}`
        });
      }
    } else {
      skipped.push('weather');
    }

    // --- Irrigation ------------------------------------------------------
    if (soil?.status === 'OK' && weather?.status === 'OK') {
      const rule1 = irrigationRules.find((r) => r.id === 'irrigation_001');
      const rule2 = irrigationRules.find((r) => r.id === 'irrigation_002');
      const delayRule = irrigationRules.find((r) => r.id === 'irrigation_003');

      let irrigationRuleApplied = false;

      // Note: irrigation.json's "< 20%" threshold maps to ~0.20 m3/m3 and 
      // should be validated against local paddy conditions, not assumed correct.
      if (soil.moisture != null) {
        if (soil.moisture < 0.20 && !weather.rainExpected) {
          recommendations.push({
            type: 'IRRIGATION', priority: rule1.priority, ruleId: rule1.id,
            message: rule1.action
          });
          irrigationRuleApplied = true;
        } else if (soil.moisture > 0.60) {
          recommendations.push({
            type: 'IRRIGATION', priority: rule2.priority, ruleId: rule2.id,
            message: rule2.action
          });
          irrigationRuleApplied = true;
        }
      } else {
        skipped.push('irrigation_moisture');
      }

      if (!irrigationRuleApplied) {
        if (weather.rainExpected && (weather.rainfallProbability ?? 0) > 70) {
          recommendations.push({
            type: 'IRRIGATION', priority: delayRule.priority, ruleId: delayRule.id,
            message: delayRule.action
          });
        } else if (!weather.rainExpected && soil.moisture == null) {
          // If soil moisture is known and doesn't trigger 001/002, we don't necessarily 
          // need the default message, but let's preserve existing behavior.
          recommendations.push({
            type: 'IRRIGATION', priority: 'LOW', ruleId: 'irrigation_default',
            message: 'No rain expected. Maintain your regular irrigation schedule.'
          });
        } else if (!weather.rainExpected) {
          recommendations.push({
            type: 'IRRIGATION', priority: 'LOW', ruleId: 'irrigation_default',
            message: 'No rain expected. Maintain your regular irrigation schedule.'
          });
        }
      }
    } else {
      skipped.push('irrigation');
    }

    if (skipped.length > 0) {
      console.log(`[DecisionEngine] Skipped rules with unavailable inputs: ${skipped.join(', ')}`);
    }

    return recommendations;
  }
}

module.exports = new DecisionEngine();
