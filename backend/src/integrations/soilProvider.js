const axios = require('axios');

/**
 * Soil Intelligence Integration - ISRIC SoilGrids and Open-Meteo.
 *
 * No mock fallback, for the same reason as weather: invented soil chemistry
 * would feed the irrigation advice as if it were measured.
 */

const getSoilData = async (lat, lon) => {
  try {
    console.log(`[Integration] Fetching soil data for ${lat}, ${lon}...`);

    const soilGridsReq = axios.get(
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

    const meteoReq = axios.get('https://api.open-meteo.com/v1/forecast', {
      params: { 
        latitude: lat, 
        longitude: lon, 
        current: 'soil_moisture_0_to_7cm',
        timezone: 'auto' 
      },
      timeout: 8000
    });

    const [soilGridsRes, meteoRes] = await Promise.allSettled([soilGridsReq, meteoReq]);

    if (soilGridsRes.status === 'rejected') {
      throw new Error(`SoilGrids API failed: ${soilGridsRes.reason.message}`);
    }

    const layers = soilGridsRes.value.data?.properties?.layers;
    if (!Array.isArray(layers) || layers.length === 0) {
      throw new Error('Invalid response from SoilGrids');
    }

    // SoilGrids returns scaled integers; divide to reach conventional units.
    const extract = (name, divisor) => {
      const layer = layers.find((l) => l.name === name);
      const mean = layer?.depths?.[0]?.values?.mean;
      return typeof mean === 'number' ? mean / divisor : null;
    };

    const soilMoisture = meteoRes.status === 'fulfilled' 
      ? meteoRes.value.data?.current?.soil_moisture_0_to_7cm 
      : null;

    return {
      ph_value: extract('phh2o', 10),      // pH*10  -> pH
      carbon_index: extract('soc', 10),    // dg/kg  -> g/kg
      density: extract('bdod', 100),       // cg/cm3 -> kg/dm3
      type: 'Geospatial Estimated',
      texture: null,
      soil_moisture: soilMoisture
    };
  } catch (error) {
    console.error('[Integration Error] Soil data fetch failed:', error.message);
    return null;
  }
};

module.exports = { getSoilData };
