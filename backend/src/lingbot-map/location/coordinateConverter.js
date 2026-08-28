/**
 * GPS helpers for LingBot-Map.
 * Converts lat/lon to metres relative to a reference origin, which is what both
 * zone clustering and the future 3D scene need (spec section 21).
 */

const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
const distanceMetres = (lat1, lon1, lat2, lon2) => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

/**
 * Local planar coordinates in metres relative to an origin.
 * East is +x, North is -z (the 3D graphics convention, matching mapping/src).
 */
const toLocalMetres = (lat, lon, originLat, originLon) => {
  const x = toRad(lon - originLon) * EARTH_RADIUS_M * Math.cos(toRad(originLat));
  const z = -toRad(lat - originLat) * EARTH_RADIUS_M;
  return { x, y: 0, z };
};

/** Mean of a set of points. Good enough at farm scale. */
const centroid = (points) => {
  if (!points || points.length === 0) return null;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.latitude, lon: acc.lon + p.longitude }),
    { lat: 0, lon: 0 }
  );
  return { latitude: sum.lat / points.length, longitude: sum.lon / points.length };
};

/** Bounding box, used by the mobile map to fit the view. */
const bounds = (points) => {
  if (!points || points.length === 0) return null;
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  return {
    minLatitude: Math.min(...lats),
    maxLatitude: Math.max(...lats),
    minLongitude: Math.min(...lons),
    maxLongitude: Math.max(...lons)
  };
};

module.exports = { distanceMetres, toLocalMetres, centroid, bounds, EARTH_RADIUS_M };
