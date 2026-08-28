import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import DiseaseResultCard from '../components/DiseaseResultCard';
import WeatherCard from '../components/WeatherCard';
import SoilCard from '../components/SoilCard';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';

export default function ResultScreen({ navigation, route }) {
  const { t } = useTranslation();
  const result = route.params?.result ?? {};

  // The backend sends `error: true` with a status for rejected images and
  // outages. Both are legitimate outcomes, rendered as first-class states.
  const status = result.status || (result.error ? 'UNAVAILABLE' : 'SUCCESS');
  const blocked = Boolean(result.error);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={t('analysis_result')}
        onBack={() => navigation.navigate('Home')}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Ionicons name="home-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <DiseaseResultCard status={status} disease={result.disease} risk={result.risk} />

        {blocked ? (
          <Card>
            <Text style={styles.message}>{result.message}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Scan')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{t('retake_photo')}</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {!blocked ? (
          <>
            <WeatherCard weather={result.weather} compact />
            <SoilCard soil={result.soil} />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Recommendation', { result })}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{t('view_recommendation')}</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Map')}
              activeOpacity={0.85}
            >
              <Ionicons name="map-outline" size={17} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>{t('view_on_map')}</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {result.dataSource && result.dataSource !== 'live' ? (
          <View style={styles.demoWarning}>
            <Ionicons name="warning-outline" size={14} color={colors.risk.MEDIUM.fg} />
            <Text style={styles.demoText}>{t('demo_data_warning')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  message: { ...typography.body, lineHeight: 21, marginBottom: spacing.lg },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md
  },
  primaryButtonText: { ...typography.button },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md
  },
  secondaryButtonText: { ...typography.body, fontWeight: '700', color: colors.primary },
  demoWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.risk.MEDIUM.bg,
    borderRadius: radius.sm,
    padding: spacing.md
  },
  demoText: { ...typography.caption, color: colors.risk.MEDIUM.fg }
});
