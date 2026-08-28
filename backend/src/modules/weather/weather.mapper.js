class WeatherMapper {
  static mapToStandard(rawResult) {
    if (!rawResult) {
      return { status: 'UNAVAILABLE' };
    }

    return {
      temperature: rawResult.temp_c || null,
      humidity: rawResult.humidity || null,
      rainExpected: rawResult.precip_mm > 0,
      rainfallProbability: rawResult.chance_of_rain || 0,
      windSpeed: rawResult.wind_kph || null,
      forecastSummary: rawResult.condition_text || "Unknown"
    };
  }
}

module.exports = WeatherMapper;
