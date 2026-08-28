/**
 * Coordinate Converter
 * Converts GPS (Latitude/Longitude) to local relative 3D space (X, Y, Z).
 */
export class CoordinateSystem {
  constructor(originLat, originLon) {
    this.originLat = originLat;
    this.originLon = originLon;
  }

  /**
   * Convert lat/lon to X, Z relative to origin (Y is elevation/height)
   */
  toLocalCoordinates(lat, lon) {
    // Rough approximation for MVP scale (1 deg lat ~ 111km)
    const latDiff = lat - this.originLat;
    const lonDiff = lon - this.originLon;

    const z = -latDiff * 111000; // moving North is -Z in typical 3D graphics
    const x = lonDiff * 111000 * Math.cos(this.originLat * (Math.PI / 180));

    return { x, y: 0, z };
  }
}
