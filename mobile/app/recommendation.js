import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import RecommendationCard from '../components/RecommendationCard';
import RiskBadge from '../components/RiskBadge';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';

export default function RecommendationScreen({ navigation, route }) {
  const { t } = useTranslation();
  const result = route.params?.result ?? {};
  const risk = result.risk;

  // Everything the engines actually used, listed so the advice is auditable.
  const evidence = [
    result.disease?.disease
      ? `${t('disease_detection')}: ${result.disease.disease} (${((result.disease.confidence ?? 0) * 100).toFixed(0)}%)`
      : null,
    result.weather?.status === 'OK'
      ? `${t('weather_conditions')}: ${Math.round(result.weather.temperature)}°C, ${result.weather.humidity}% ${t('humidity').toLowerCase()}`
      : `${t('weather_conditions')}: ${t('status_unavailable')}`,
    result.soil?.status === 'OK'
      ? `${t('soil_conditions')}: pH ${result.soil.ph?.toFixed?.(1) ?? '--'}`
      : `${t('soil_conditions')}: ${t('status_unavailable')}`
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('smart_recommendation')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {risk ? (
          <Card style={styles.riskCard}>
            <View style={styles.riskRow}>
              <View>
                <Text style={styles.riskLabel}>{t('risk_level')}</Text>
                <Text style={styles.riskScore}>{risk.riskScore}/100</Text>
              </View>
              <RiskBadge level={risk.riskLevel} />
            </View>
            <Text style={styles.riskAlert}>{risk.alert}</Text>
          </Card>
        ) : null}

        <RecommendationCard recommendation={result.recommendation} />

        <Card>
          <View style={styles.whyHeader}>
            <Ionicons name="help-circle-outline" size={17} color={colors.primary} />
            <Text style={styles.whyTitle}>{t('why_seeing_this')}</Text>
          </View>
          <Text style={styles.whyText}>{t('why_explanation')}</Text>
          {evidence.map((line, index) => (
            <View key={index} style={styles.evidenceRow}>
              <Ionicons name="ellipse" size={5} color={colors.textMuted} />
              <Text style={styles.evidenceText}>{line}</Text>
            </View>
          ))}
        </Card>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Map')}
          activeOpacity={0.85}
        >
          <Ionicons name="map-outline" size={17} color={colors.white} />
          <Text style={styles.primaryButtonText}>{t('view_on_map')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  riskCard: { gap: spacing.md },
  riskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  riskLabel: { ...typography.caption },
  riskScore: { ...typography.title, marginTop: 2 },
  riskAlert: { ...typography.bodySecondary, lineHeight: 20 },
  whyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  whyTitle: { ...typography.subheading },
  whyText: { ...typography.bodySecondary, lineHeight: 20, marginBottom: spacing.md },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  evidenceText: { ...typography.bodySecondary, flex: 1 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md
  },
  primaryButtonText: { ...typography.button }
});
