class WeatherMapper {
  static mapToStandard(rawResult) {
    if (!rawResult) {
      return { status: 'UNAVAILABLE' };
    }

    // ?? not ||: 0 degrees, 0 wind and 0 humidity are real readings.
    return {
      status: 'OK',
      temperature: rawResult.temp_c ?? null,
      humidity: rawResult.humidity ?? null,
      precipitation: rawResult.precip_mm ?? null,
      // "Expected", not "falling now": use the forecast probability, falling
      // back to current precipitation only when the forecast is missing.
      rainExpected:
        rawResult.chance_of_rain != null
          ? rawResult.chance_of_rain >= 50
          : (rawResult.precip_mm ?? 0) > 0,
      rainfallProbability: rawResult.chance_of_rain ?? null,
      windSpeed: rawResult.wind_kph ?? null,
      forecastSummary: rawResult.condition_text || 'Unknown'
    };
  }
}

module.exports = WeatherMapper;
