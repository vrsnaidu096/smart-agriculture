const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const { getWeatherData } = require('../src/integrations/weatherProvider');
const { getSoilData } = require('../src/integrations/soilProvider');
const WeatherMapper = require('../src/modules/weather/weather.mapper');
const SoilMapper = require('../src/modules/soil/soil.mapper');

const openMeteoFixture = require('./fixtures/open-meteo-response.json');

describe('Mappers and Providers with Open-Meteo Fixture', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('WeatherMapper', () => {
    it('should map Open-Meteo response to standard weather format', async () => {
      sinon.stub(axios, 'get').resolves({ data: openMeteoFixture });

      const rawWeather = await getWeatherData(52.52, 13.41);
      const mappedWeather = WeatherMapper.mapToStandard(rawWeather);

      expect(mappedWeather.status).to.equal('OK');
      expect(mappedWeather.temperature).to.equal(13.5);
      expect(mappedWeather.humidity).to.equal(58);
      expect(mappedWeather.precipitation).to.equal(0);
      expect(mappedWeather.windSpeed).to.equal(12.3);
      expect(mappedWeather.forecastSummary).to.equal('Cloudy'); // weather_code 3
      expect(mappedWeather.rainfallProbability).to.equal(85);
      expect(mappedWeather.rainExpected).to.be.true; // >= 50
    });
  });

  describe('SoilMapper', () => {
    it('should map SoilGrids + Open-Meteo response to standard soil format', async () => {
      // Stub axios.get to return appropriate responses based on URL
      sinon.stub(axios, 'get').callsFake(async (url) => {
        if (url.includes('open-meteo')) {
          return { data: openMeteoFixture };
        }
        if (url.includes('soilgrids')) {
          return {
            data: {
              properties: {
                layers: [
                  { name: 'phh2o', depths: [{ values: { mean: 65 } }] },
                  { name: 'soc', depths: [{ values: { mean: 200 } }] },
                  { name: 'bdod', depths: [{ values: { mean: 130 } }] }
                ]
              }
            }
          };
        }
        throw new Error('Unexpected URL');
      });

      const rawSoil = await getSoilData(52.52, 13.41);
      const mappedSoil = SoilMapper.mapToStandard(rawSoil);

      expect(mappedSoil.status).to.equal('OK');
      expect(mappedSoil.ph).to.equal(6.5); // 65 / 10
      expect(mappedSoil.organicCarbon).to.equal(20); // 200 / 10
      expect(mappedSoil.bulkDensity).to.equal(1.3); // 130 / 100
      expect(mappedSoil.moisture).to.equal(0.15); // from openMeteoFixture
    });
  });
});
