# LingBot-Map Architecture

The spatial mapping engine for the platform.

## Boundary Storage
Farm boundaries are handled by `backend/src/lingbot-map/farm/boundary.service.js`. They are stored in standard **GeoJSON** format, specifically as `Polygon` or `MultiPolygon` features. This allows seamless integration with standard mapping libraries (like react-native-maps or Mapbox) and geospatial databases (like PostGIS).

## Zone Clustering
Managed by `backend/src/lingbot-map/farm/zone.service.js` and `spatialAnalysis.js`. The clustering groups scans into Risk Zones (Healthy, Monitoring, High Risk). This clustering allows the map to render color-coded overlays without rendering thousands of individual scan markers, improving mobile rendering performance.

## Coordinate Converter
Typically resides in `spatialAnalysis.js` (or location utilities), translating device GPS coordinates into local grid coordinates or projecting them for Web Mercator rendering. It ensures point accuracy during boundary walking.

## 3D Architecture
The map architecture is designed to support 3D rendering (e.g. terrain elevation, drone scan altitudes) in the future. Data structures are pre-configured to accept `Z` coordinates (altitude/elevation) alongside standard `[longitude, latitude]` pairs in the GeoJSON.
