const SoilMapper = require('./soil.mapper');
const { getSoilData } = require('../../integrations/soilProvider');

class SoilService {
  async getSoilForLocation(lat, lon) {
    try {
      const rawSoil = await getSoilData(lat, lon);
      return SoilMapper.mapToStandard(rawSoil);
    } catch (error) {
      console.error('Soil service failed:', error.message);
      return { status: 'UNAVAILABLE' };
    }
  }
}

module.exports = new SoilService();
