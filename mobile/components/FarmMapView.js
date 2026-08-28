import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Polygon, Circle, Marker, UrlTile } from 'react-native-maps';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';

const MARKER_COLOUR = {
  HIGH_RISK: colors.zone.HIGH_RISK,
  MONITOR: colors.zone.MONITORING,
  HEALTHY: colors.zone.HEALTHY,
  INVALID: colors.textMuted,
  UNKNOWN: colors.textMuted
};

export default function FarmMapView({ boundary, markers = [], zones = [], height = 320 }) {
  const { t } = useTranslation();

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
    markers.forEach(m => {
      allLats.push(m.latitude);
      allLons.push(m.longitude);
    });
    zones.forEach(z => {
      if (z.centre) {
        allLats.push(z.centre.latitude);
        allLons.push(z.centre.longitude);
      }
    });

    if (allLats.length === 0) return null;

    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLon = Math.min(...allLons);
    const maxLon = Math.max(...allLons);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.005,
      longitudeDelta: (maxLon - minLon) * 1.5 || 0.005,
    };
  }, [boundaryPoints, markers, zones]);

  if (!initialRegion) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>{t('no_boundary')}</Text>
        <Text style={styles.placeholderDetail}>{t('no_boundary_detail')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={{ width: '100%', height: '100%' }}
        initialRegion={initialRegion}
        mapType="none" // Bypasses Google/Apple base maps
      >
        <UrlTile
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />

        {boundaryPoints && (
          <Polygon
            coordinates={boundaryPoints}
            fillColor="rgba(27, 122, 62, 0.2)"
            strokeColor={colors.primary}
            strokeWidth={2}
          />
        )}

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
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...typography.bodySecondary }
});
