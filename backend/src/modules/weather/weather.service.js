const WeatherMapper = require('./weather.mapper');
const { getWeatherData } = require('../../integrations/weatherProvider');

class WeatherService {
  async getWeatherForLocation(lat, lon) {
    try {
      const rawWeather = await getWeatherData(lat, lon);
      return WeatherMapper.mapToStandard(rawWeather);
    } catch (error) {
      console.error('Weather service failed:', error.message);
      return { status: 'UNAVAILABLE' };
    }
  }
}

module.exports = new WeatherService();
