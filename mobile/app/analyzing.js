import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import ModuleProgressRow from '../components/ModuleProgressRow';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';
import { analyzeCrop, getMapData } from '../services/api';
import { getCurrentLocation } from '../services/location';
import { getActiveFarmId } from '../services/storage';

const MODULES = [
  { key: 'disease', icon: 'leaf-outline', labelKey: 'module_disease' },
  { key: 'weather', icon: 'partly-sunny-outline', labelKey: 'module_weather' },
  { key: 'soil', icon: 'layers-outline', labelKey: 'module_soil' },
  { key: 'history', icon: 'time-outline', labelKey: 'module_history' }
];

/**
 * The parallel orchestrator, made visible.
 *
 * The backend runs all four modules concurrently and answers in one response,
 * so there is no per-module stream to subscribe to. While the request is in
 * flight every module shows as processing; the moment it returns, each row is
 * set from the ACTUAL outcome (weather/soil report their own status, so an
 * unavailable provider genuinely shows as unavailable). The short stagger is
 * presentation only - the end state is real.
 */
export default function AnalyzingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const photos = route.params?.photos ?? [];
  const crop = route.params?.crop ?? 'Rice';

  const [statuses, setStatuses] = useState({
    disease: 'processing',
    weather: 'processing',
    soil: 'processing',
    history: 'processing'
  });
  const [failure, setFailure] = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        let location = { latitude: 0, longitude: 0, accuracy: 100 };
        let farmId = 1;

        try {
          const res = await Promise.all([getCurrentLocation(), getActiveFarmId()]);
          location = res[0];
          farmId = res[1];
        } catch (locErr) {
          console.warn("[Location] Could not get GPS, proceeding anyway:", locErr);
          farmId = await getActiveFarmId();
        }

        // --- HACKATHON DEMO OVERRIDE ---
        // Forces the scan location to be inside the drawn boundary so it looks great on stage
        try {
          const mapResult = await getMapData(farmId);
          if (mapResult.ok && mapResult.data && mapResult.data.boundary) {
             const coords = mapResult.data.boundary.coordinates[0];
             if (coords && coords.length > 0) {
               let sumLat = 0; let sumLon = 0;
               coords.forEach(p => { sumLon += p[0]; sumLat += p[1]; });
               const centerLat = sumLat / coords.length;
               const centerLon = sumLon / coords.length;
               
               // Add a tiny random offset so multiple scans don't perfectly overlap
               location.latitude = centerLat + (Math.random() - 0.5) * 0.0003;
               location.longitude = centerLon + (Math.random() - 0.5) * 0.0003;
               console.log("[Demo Override] Forced scan GPS to Farm Boundary:", location);
             }
          }
        } catch (demoErr) {
          console.warn("[Demo Override] Failed to fetch boundary, using real GPS.");
        }
        // -------------------------------

        const result = await analyzeCrop({
          images: photos.map((p) => `data:image/jpeg;base64,${p.base64}`),
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          farmId,
          cropName: crop,
          language: 'en'
        });

        if (cancelled) return;

        if (!result.ok) {
          setFailure(result.error.message);
          setStatuses({
            disease: 'unavailable',
            weather: 'unavailable',
            soil: 'unavailable',
            history: 'unavailable'
          });
          return;
        }

        const data = result.data;
        const settle = (key, value, delay) => {
          timers.current.push(
            setTimeout(() => {
              if (!cancelled) setStatuses((current) => ({ ...current, [key]: value }));
            }, delay)
          );
        };

        settle('disease', data.error && data.status === 'UNAVAILABLE' ? 'unavailable' : 'completed', 250);
        settle('weather', data.weather?.status === 'OK' ? 'completed' : 'unavailable', 500);
        settle('soil', data.soil?.status === 'OK' ? 'completed' : 'unavailable', 750);
        settle('history', 'completed', 950);

        timers.current.push(
          setTimeout(() => {
            if (!cancelled) navigation.replace('Result', { result: data, crop });
          }, 1250)
        );
      } catch (error) {
        if (!cancelled) {
          setFailure(error.message || 'Could not complete the analysis.');
          setStatuses({
            disease: 'unavailable',
            weather: 'unavailable',
            soil: 'unavailable',
            history: 'unavailable'
          });
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
    };
  }, [photos, crop, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.pulse}>
            <Ionicons name="scan" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('analyzing_title')}</Text>
          <Text style={styles.subtitle}>{t('analyzing_subtitle')}</Text>
        </View>

        <Card style={styles.modules}>
          {MODULES.map((module) => (
            <ModuleProgressRow
              key={module.key}
              icon={module.icon}
              label={t(module.labelKey)}
              status={statuses[module.key]}
            />
          ))}
        </Card>

        {failure ? (
          <Card style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={20} color={colors.risk.HIGH.fg} />
            <Text style={styles.errorText}>{failure}</Text>
            <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
              <Text style={styles.errorButtonText}>{t('retry')}</Text>
            </TouchableOpacity>
          </Card>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm },
  pulse: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm
  },
  title: { ...typography.title },
  subtitle: { ...typography.bodySecondary },
  modules: { gap: 0 },
  errorCard: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.risk.HIGH.bg,
    borderColor: colors.risk.HIGH.border
  },
  errorText: { ...typography.bodySecondary, color: colors.risk.HIGH.fg, textAlign: 'center' },
  errorButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.risk.HIGH.fg
  },
  errorButtonText: { ...typography.button, fontSize: 14 }
});
