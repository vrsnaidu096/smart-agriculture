const axios = require('axios');

/**
 * Soil Intelligence Integration - ISRIC SoilGrids (public, no key required).
 *
 * No mock fallback, for the same reason as weather: invented soil chemistry
 * would feed the irrigation advice as if it were measured.
 */

const getSoilData = async (lat, lon) => {
  try {
    console.log(`[Integration] Fetching soil data for ${lat}, ${lon} from ISRIC SoilGrids...`);

    const response = await axios.get(
      'https://rest.isric.org/soilgrids/v2.0/properties/query',
      {
        params: {
          lat,
          lon,
          property: ['phh2o', 'soc', 'bdod'],
          depth: '0-5cm'
        },
        paramsSerializer: (params) =>
          Object.entries(params)
            .flatMap(([key, value]) =>
              Array.isArray(value)
                ? value.map((v) => `${key}=${encodeURIComponent(v)}`)
                : [`${key}=${encodeURIComponent(value)}`]
            )
            .join('&'),
        timeout: 10000
      }
    );

    const layers = response.data?.properties?.layers;
    if (!Array.isArray(layers) || layers.length === 0) {
      throw new Error('Invalid response from SoilGrids');
    }

    // SoilGrids returns scaled integers; divide to reach conventional units.
    const extract = (name, divisor) => {
      const layer = layers.find((l) => l.name === name);
      const mean = layer?.depths?.[0]?.values?.mean;
      return typeof mean === 'number' ? mean / divisor : null;
    };

    return {
      ph_value: extract('phh2o', 10),      // pH*10  -> pH
      carbon_index: extract('soc', 10),    // dg/kg  -> g/kg
      density: extract('bdod', 100),       // cg/cm3 -> kg/dm3
      type: 'Geospatial Estimated',
      texture: null
    };
  } catch (error) {
    console.error('[Integration Error] SoilGrids API failed:', error.message);
    return null;
  }
};

module.exports = { getSoilData };
