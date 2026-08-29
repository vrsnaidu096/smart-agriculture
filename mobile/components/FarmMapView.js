import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Polygon, Circle, Marker, Callout, Heatmap } from 'react-native-maps';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';

const MARKER_COLOUR = {
  HIGH_RISK: colors.zone.HIGH_RISK,
  MONITOR: colors.zone.MONITORING,
  HEALTHY: colors.zone.HEALTHY,
  INVALID: colors.textMuted,
  UNKNOWN: colors.textMuted
};

export default function FarmMapView({ boundary, markers = [], zones = [], height = 320, onPress, onLongPress, onPanDrag, scrollEnabled = true, is3D = false }) {
  const { t } = useTranslation();
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) {
      if (is3D) {
        mapRef.current.animateCamera({ pitch: 65, zoom: 18.5 }, { duration: 1000 });
      } else {
        mapRef.current.animateCamera({ pitch: 0, zoom: 17 }, { duration: 1000 });
      }
    }
  }, [is3D]);

  // Generate stable "Demo Jitter" so desk-testing looks like a real farm
  const jitteredMarkers = useMemo(() => {
    return markers.map((m, index) => {
      // 0.0003 degrees is roughly 30 meters. We use sin/cos of index to make the random spread stable between renders.
      const latOffset = (Math.sin(index * 12.9898) * 0.0003);
      const lonOffset = (Math.cos(index * 78.233) * 0.0003);
      return {
        ...m,
        latitude: m.latitude + latOffset,
        longitude: m.longitude + lonOffset
      };
    });
  }, [markers]);

  // Generate heatmap points from the jittered markers
  const heatmapPoints = useMemo(() => {
    return jitteredMarkers.map(m => {
      let weight = 10; // default healthy
      if (m.state === 'HIGH_RISK') weight = 100;
      else if (m.state === 'MONITOR') weight = 50;
      return { latitude: m.latitude, longitude: m.longitude, weight };
    });
  }, [jitteredMarkers]);

  // Extract polygon points in { latitude, longitude } format for react-native-maps
  const boundaryPoints = useMemo(() => {
    if (boundary?.coordinates?.[0]) {
      return boundary.coordinates[0].map(([lon, lat]) => ({
        latitude: lat,
        longitude: lon
      }));
    }
    return null;
  }, [boundary]);

  // Determine the bounding box to automatically center the map
  const initialRegion = useMemo(() => {
    const allLats = [];
    const allLons = [];
    if (boundaryPoints) {
      boundaryPoints.forEach(p => {
        allLats.push(p.latitude);
        allLons.push(p.longitude);
      });
    }
    jitteredMarkers.forEach(m => {
      allLats.push(m.latitude);
      allLons.push(m.longitude);
    });
    zones.forEach(z => {
      if (z.centre) {
        allLats.push(z.centre.latitude);
        allLons.push(z.centre.longitude);
      }
    });

    if (allLats.length === 0) {
       // Fallback to a default region if completely empty so they can at least see a map to start drawing
       return {
          latitude: 16.5062,
          longitude: 80.6480,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
       };
    }

    const maxLat = Math.max(...allLats);
    const minLon = Math.min(...allLons);
    const maxLon = Math.max(...allLons);
    const minLat = Math.min(...allLats);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.005,
      longitudeDelta: (maxLon - minLon) * 1.5 || 0.005,
    };
  }, [boundaryPoints, jitteredMarkers, zones]);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}
        initialRegion={initialRegion}
        mapType="satellite"
        onPress={onPress}
        onLongPress={onLongPress}
        onPanDrag={onPanDrag}
        scrollEnabled={scrollEnabled}
        showsUserLocation={true}
        showsMyLocationButton={true}
        pitchEnabled={true}
        showsBuildings={true}
      >
        {boundaryPoints && (
          <Polygon
            coordinates={boundaryPoints}
            fillColor="rgba(27, 122, 62, 0.2)"
            strokeColor={colors.primary}
            strokeWidth={2}
          />
        )}

        {heatmapPoints.length > 0 && (
          <Heatmap
            points={heatmapPoints}
            radius={50}
            opacity={0.8}
            gradient={{
              colors: ['transparent', colors.zone.HEALTHY, colors.zone.MONITORING, colors.zone.HIGH_RISK],
              startPoints: [0.01, 0.25, 0.5, 1],
              colorMapSize: 256
            }}
          />
        )}

        {jitteredMarkers.map((m) => (
          <Marker 
            key={m.id || Math.random().toString()} 
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          >
            {/* Invisible view to hide the teardrop pin but keep the callout clickable */}
            <View style={{ width: 30, height: 30, backgroundColor: 'transparent' }} />
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{m.disease === 'CLEAN' ? 'Healthy Crop' : (m.disease || 'Unknown')}</Text>
                <Text style={styles.calloutDate}>{m.timestamp ? new Date(m.timestamp).toLocaleDateString() : ''}</Text>
                {m.riskLevel && (
                  <View style={[styles.badge, { backgroundColor: MARKER_COLOUR[m.state] }]}>
                    <Text style={styles.badgeText}>{m.riskLevel} RISK</Text>
                  </View>
                )}
              </View>
            </Callout>
          </Marker>
        ))}

        {zones.map((zone) => {
          if (!zone.centre) return null;
          const colour = colors.zone[zone.type] || colors.textMuted;
          // React Native Maps Circle takes a radius in meters
          return (
            <Circle
              key={zone.id}
              center={{ latitude: zone.centre.latitude, longitude: zone.centre.longitude }}
              radius={zone.radiusMetres || 50}
              fillColor={`${colour}33`} // 20% opacity hex
              strokeColor={colour}
              strokeWidth={1.5}
            />
          );
        })}

        {markers.map((marker) => {
          const colour = MARKER_COLOUR[marker.state] || colors.textMuted;
          return (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              pinColor={colour}
            />
          );
        })}
      </MapView>
    </View>
  );
}

export function MapLegend() {
  const { t } = useTranslation();
  const items = [
    { colour: colors.zone.HIGH_RISK, label: t('high_risk_zone') },
    { colour: colors.zone.MONITORING, label: t('monitoring_zone') },
    { colour: colors.zone.HEALTHY, label: t('healthy_zone') }
  ];

  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.colour }]} />
          <Text style={styles.legendLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl
  },
  placeholderText: { ...typography.subheading, textAlign: 'center' },
  placeholderDetail: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 240
  },
  legend: { marginTop: spacing.md, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { ...typography.bodySecondary, fontSize: 13, flex: 1 },
  callout: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    minWidth: 150,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutTitle: { ...typography.body, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  calloutDate: { ...typography.caption, color: colors.textMuted, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' }
});
