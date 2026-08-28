class SafetyValidator {
  validate(recommendations, farmContext) {
    let safeRecommendations = [...recommendations];
    
    const hasRain = farmContext.weather?.rainExpected;
    const hasHighWind = farmContext.weather?.windSpeed > 20;

    // Iterate through recommendations to look for environmental conflicts
    safeRecommendations = safeRecommendations.map(rec => {
      // If disease treatment is recommended but rain is expected, modify the recommendation
      if (rec.type === 'DISEASE' && hasRain) {
        return {
          ...rec,
          message: `${rec.message} [SAFETY WARNING]: Delay treatment; rainfall will reduce effectiveness.`
        };
      }

      if (rec.type === 'DISEASE' && hasHighWind) {
        return {
          ...rec,
          message: `${rec.message} [SAFETY WARNING]: High winds! Drift hazard during spraying.`
        };
      }

      return rec;
    });

    return safeRecommendations;
  }
}

module.exports = new SafetyValidator();
