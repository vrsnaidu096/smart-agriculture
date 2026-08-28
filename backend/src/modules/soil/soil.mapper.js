class SoilMapper {
  static mapToStandard(rawResult) {
    if (!rawResult) {
      return { status: 'UNAVAILABLE' };
    }

    return {
      ph: rawResult.ph_value || null,
      organicCarbon: rawResult.carbon_index || null,
      soilType: rawResult.type || "Unknown",
      bulkDensity: rawResult.density || null,
      texture: rawResult.texture || null
    };
  }
}

module.exports = SoilMapper;
