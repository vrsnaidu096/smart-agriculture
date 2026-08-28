import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, G } from 'react-native-svg';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';

/**
 * LingBot-Map 2D renderer.
 *
 * Draws the farm boundary, risk zones and scan markers in a plain SVG viewport.
 * Deliberately not a tile map: the MVP needs relative geometry, not satellite
 * imagery, and this keeps the app free of a heavy native map dependency.
 * Swapping in react-native-maps later only touches this file.
 */

const MARKER_COLOUR = {
  HIGH_RISK: colors.zone.HIGH_RISK,
  MONITOR: colors.zone.MONITORING,
  HEALTHY: colors.zone.HEALTHY,
  INVALID: colors.textMuted,
  UNKNOWN: colors.textMuted
};

const PAD = 0.12;

export default function FarmMapView({ boundary, markers = [], zones = [], height = 320 }) {
  const { t } = useTranslation();

  const geometry = useMemo(() => {
    const points = [];

    if (boundary?.coordinates?.[0]) {
      // GeoJSON stores [longitude, latitude].
      for (const [lon, lat] of boundary.coordinates[0]) points.push({ latitude: lat, longitude: lon });
    }
    for (const m of markers) points.push({ latitude: m.latitude, longitude: m.longitude });
    for (const z of zones) if (z.centre) points.push(z.centre);

    if (points.length === 0) return null;

    const lats = points.map((p) => p.latitude);
    const lons = points.map((p) => p.longitude);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const lonScale = Math.cos((midLat * Math.PI) / 180) || 1;

    // Work in a flat plane first: east-west compressed by latitude.
    const flat = points.map((p) => ({ x: p.longitude * lonScale, y: -p.latitude }));
    let minX = Math.min(...flat.map((p) => p.x));
    let maxX = Math.max(...flat.map((p) => p.x));
    let minY = Math.min(...flat.map((p) => p.y));
    let maxY = Math.max(...flat.map((p) => p.y));

    // A single scan has zero extent; give it a small window so it is visible.
    const spanX = maxX - minX || 0.0008;
    const spanY = maxY - minY || 0.0008;
    const padX = spanX * PAD;
    const padY = spanY * PAD;
    minX -= padX; maxX += padX; minY -= padY; maxY += padY;

    const width = 320;
    const scale = Math.min(width / (maxX - minX), height / (maxY - minY));
    const offsetX = (width - (maxX - minX) * scale) / 2;
    const offsetY = (height - (maxY - minY) * scale) / 2;

    const project = (lat, lon) => ({
      x: (lon * lonScale - minX) * scale + offsetX,
      y: (-lat - minY) * scale + offsetY
    });

    // Degrees of latitude to pixels, for drawing zone radii to scale.
    const metresToPixels = (metres) => (metres / 111000) * scale;

    return { project, metresToPixels, width, height };
  }, [boundary, markers, zones, height]);

  if (!geometry) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>{t('no_boundary')}</Text>
        <Text style={styles.placeholderDetail}>{t('no_boundary_detail')}</Text>
      </View>
    );
  }

  const { project, metresToPixels, width } = geometry;

  const boundaryPoints = boundary?.coordinates?.[0]
    ? boundary.coordinates[0]
        .map(([lon, lat]) => {
          const p = project(lat, lon);
          return `${p.x},${p.y}`;
        })
        .join(' ')
    : null;

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width={width} height={height}>
        {boundaryPoints ? (
          <Polygon
            points={boundaryPoints}
            fill={colors.primary}
            fillOpacity={0.08}
            stroke={colors.primary}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        ) : null}

        {zones.map((zone) => {
          if (!zone.centre) return null;
          const p = project(zone.centre.latitude, zone.centre.longitude);
          const colour = colors.zone[zone.type] || colors.textMuted;
          return (
            <Circle
              key={zone.id}
              cx={p.x}
              cy={p.y}
              r={Math.max(metresToPixels(zone.radiusMetres || 50), 14)}
              fill={colour}
              fillOpacity={0.18}
              stroke={colour}
              strokeWidth={1.5}
            />
          );
        })}

        {markers.map((marker) => {
          const p = project(marker.latitude, marker.longitude);
          const colour = MARKER_COLOUR[marker.state] || colors.textMuted;
          return (
            <G key={marker.id}>
              <Circle cx={p.x} cy={p.y} r={7} fill={colour} stroke={colors.white} strokeWidth={2} />
            </G>
          );
        })}
      </Svg>
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
    alignItems: 'center',
    justifyContent: 'center'
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
