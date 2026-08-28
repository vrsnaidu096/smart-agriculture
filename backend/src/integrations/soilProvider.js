const axios = require('axios');

/**
 * Soil Intelligence Integration
 * Communicates with ISRIC SoilGrids REST API.
 * This is a public free API, no key required.
 */
const getSoilData = async (lat, lon) => {
  try {
    console.log(`[Integration] Fetching soil data for ${lat}, ${lon} from ISRIC SoilGrids...`);
    
    // Querying for pH in water (phh2o), Soil Organic Carbon (soc), and bulk density (bdod)
    const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${lat}&lon=${lon}&property=phh2o&property=soc&property=bdod&depth=0-5cm`;
    
    const response = await axios.get(url, { timeout: 10000 });
    const layers = response.data?.properties?.layers;

    if (!layers) {
      throw new Error("Invalid response from SoilGrids");
    }

    // Helper to extract the mean value of the top layer (0-5cm)
    const extractValue = (propertyName) => {
      const layer = layers.find(l => l.name === propertyName);
      if (layer && layer.depths && layer.depths[0]) {
        // SoilGrids returns integers that often need dividing (e.g., pH * 10)
        return layer.depths[0].values.mean;
      }
      return null;
    };

    const phRaw = extractValue('phh2o');
    const socRaw = extractValue('soc');
    const bdodRaw = extractValue('bdod');

    return {
      ph_value: phRaw ? phRaw / 10 : null, // Convert to standard pH
      carbon_index: socRaw ? socRaw / 10 : null, // dg/kg to g/kg
      density: bdodRaw ? bdodRaw / 100 : null, // cg/cm3 to kg/dm3
      type: "Geospatial Estimated", // SoilGrids doesn't directly return a simple string type in this endpoint
      texture: null
    };

  } catch (error) {
    console.error('[Integration Error] SoilGrids API failed:', error.message);
    console.log('[Fail-safe] Falling back to mock soil data...');
    return getMockSoil();
  }
};

const getMockSoil = () => {
  return {
    ph_value: 6.5,
    carbon_index: 1.2,
    type: "Loamy",
    density: 1.3,
    texture: null
  };
};

module.exports = {
  getSoilData
};
