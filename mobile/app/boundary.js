import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import FarmMapView from '../components/FarmMapView';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';
import { saveBoundary } from '../services/api';
import { getActiveFarmId } from '../services/storage';

const MIN_POINTS = 3;
const TARGET_POINTS = 60;
// Ignore fixes closer than this to the last kept point: standing still would
// otherwise fill the polygon with duplicates.
const MIN_SPACING_METRES = 3;

const distance = (a, b) => {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const accuracyLabel = (metres) => {
  if (metres == null) return '--';
  if (metres <= 8) return 'High';
  if (metres <= 20) return 'Medium';
  return 'Low';
};

export default function BoundaryScreen({ navigation }) {
  const { t } = useTranslation();
  const [points, setPoints] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [saving, setSaving] = useState(false);
  const [permissionDenied, setDenied] = useState(false);
  const subscription = useRef(null);

  useEffect(() => {
    return () => {
      if (subscription.current) subscription.current.remove();
    };
  }, []);

  const start = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setDenied(true);
      return;
    }

    subscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: MIN_SPACING_METRES, timeInterval: 2000 },
      (location) => {
        const point = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        setAccuracy(location.coords.accuracy);
        setPoints((current) => {
          const last = current[current.length - 1];
          if (last && distance(last, point) < MIN_SPACING_METRES) return current;
          return [...current, point];
        });
      }
    );
    setTracking(true);
  };

  const pause = () => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
    setTracking(false);
  };

  const finish = async () => {
    pause();

    if (points.length < MIN_POINTS) {
      Alert.alert(t('map_farm'), `At least ${MIN_POINTS} points are needed to close a boundary.`);
      return;
    }

    setSaving(true);
    const farmId = await getActiveFarmId();

    // GeoJSON wants [longitude, latitude] and a closed ring.
    const ring = points.map((p) => [p.longitude, p.latitude]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);

    const result = await saveBoundary(farmId, ring);
    setSaving(false);

    if (result.ok) {
      navigation.navigate('Map');
    } else {
      Alert.alert(t('error_generic'), result.error.message);
    }
  };

  const previewBoundary =
    points.length >= 2
      ? { type: 'Polygon', coordinates: [points.map((p) => [p.longitude, p.latitude])] }
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('map_farm')} onBack={() => { pause(); navigation.goBack(); }} />

      <View style={styles.content}>
        <Text style={styles.hint}>{t('map_farm_hint') || 'Tap the map to drop pins and outline your farm boundary.'}</Text>

        <FarmMapView 
          boundary={previewBoundary} 
          markers={[]} 
          zones={[]} 
          height={280} 
          onPress={(e) => {
            if (!tracking) return;
            const pt = e.nativeEvent.coordinate;
            setPoints(current => [...current, { latitude: pt.latitude, longitude: pt.longitude }]);
          }}
        />

        {permissionDenied ? (
          <Card style={styles.warning}>
            <Text style={styles.warningText}>{t('permission_location')}</Text>
          </Card>
        ) : null}

        <Card style={styles.statsCard}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t('accuracy') || 'Method'}</Text>
            <Text style={styles.statValue}>{accuracy ? accuracyLabel(accuracy) : 'Manual Tap'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t('points')}</Text>
            <Text style={styles.statValue}>{points.length}/{TARGET_POINTS}</Text>
          </View>
        </Card>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
               if (tracking) { pause(); } 
               else { setTracking(true); }
            }}
            activeOpacity={0.85}
          >
            <Ionicons
              name={tracking ? 'pause' : 'play'}
              size={17}
              color={colors.textSecondary}
            />
            <Text style={styles.secondaryText}>
              {tracking ? t('pause') : points.length ? t('resume') : t('start_mapping')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, (points.length < MIN_POINTS || saving) && styles.disabled]}
            onPress={finish}
            disabled={points.length < MIN_POINTS || saving}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>
              {saving ? t('loading') : t('finish_mapping')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  hint: { ...typography.bodySecondary, textAlign: 'center' },
  statsCard: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  statLabel: { ...typography.caption },
  statValue: { ...typography.subheading, marginTop: 2 },
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: 'auto' },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  secondaryText: { ...typography.body, fontWeight: '700', color: colors.textSecondary },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary
  },
  primaryText: { ...typography.button },
  disabled: { opacity: 0.5 },
  warning: { backgroundColor: colors.risk.MEDIUM.bg, borderColor: colors.risk.MEDIUM.border },
  warningText: { ...typography.bodySecondary, color: colors.risk.MEDIUM.fg }
});
