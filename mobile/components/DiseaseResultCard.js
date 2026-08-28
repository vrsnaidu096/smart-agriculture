import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import RiskBadge from './RiskBadge';
import { colors, spacing, radius, typography, riskPalette } from '../theme';
import { useTranslation } from '../i18n';

/**
 * Headline result. Deliberately renders four different states, because
 * "abstained" and "not a crop" are real answers - not errors to hide.
 */
export default function DiseaseResultCard({ status, disease, risk }) {
  const { t } = useTranslation();

  const state = (() => {
    if (status === 'SUCCESS' && disease?.healthStatus === 'DISEASE_DETECTED') {
      return { key: 'disease', icon: 'warning', palette: riskPalette(risk?.riskLevel || 'HIGH'), heading: t('attention_needed') };
    }
    if (status === 'SUCCESS') {
      return { key: 'healthy', icon: 'checkmark-circle', palette: riskPalette('LOW'), heading: t('looks_healthy') };
    }
    if (status === 'ABSTAINED') {
      return { key: 'unclear', icon: 'help-circle', palette: riskPalette('MEDIUM'), heading: t('photo_unclear') };
    }
    if (status === 'REJECTED') {
      return { key: 'notcrop', icon: 'close-circle', palette: riskPalette('UNKNOWN'), heading: t('not_a_crop') };
    }
    return { key: 'unavailable', icon: 'cloud-offline', palette: riskPalette('UNKNOWN'), heading: t('service_unavailable') };
  })();

  const showsDisease = state.key === 'disease';
  const confidencePct =
    disease?.confidence != null ? `${(disease.confidence * 100).toFixed(0)}%` : '--';

  return (
    <Card style={{ borderColor: state.palette.border, backgroundColor: state.palette.bg }}>
      <View style={styles.headingRow}>
        <Ionicons name={state.icon} size={18} color={state.palette.fg} />
        <Text style={[styles.heading, { color: state.palette.fg }]}>{state.heading}</Text>
      </View>

      {showsDisease ? (
        <Text style={styles.disease}>
          {t('possible')} {disease.disease}
        </Text>
      ) : null}

      {state.key === 'healthy' ? (
        <Text style={styles.disease}>{disease?.crop || ''}</Text>
      ) : null}

      <View style={styles.statRow}>
        {status === 'SUCCESS' || status === 'ABSTAINED' ? (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t('confidence')}</Text>
            <Text style={[styles.statValue, { color: state.palette.fg }]}>{confidencePct}</Text>
          </View>
        ) : null}

        {risk?.riskLevel ? (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t('risk_level')}</Text>
            <RiskBadge level={risk.riskLevel} />
          </View>
        ) : null}
      </View>

      {risk?.confidence === 'PARTIAL' ? (
        <View style={styles.partial}>
          <Ionicons name="information-circle-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.partialText}>
            {t('risk_partial_note')}
            {risk.signalsMissing?.length ? ` (${risk.signalsMissing.join(', ')})` : ''}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { fontSize: 14, fontWeight: '700' },
  disease: { ...typography.title, marginTop: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.xxl, marginTop: spacing.lg },
  stat: { gap: 4 },
  statLabel: { ...typography.caption },
  statValue: { fontSize: 26, fontWeight: '700' },
  partial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  partialText: { ...typography.caption, flex: 1 }
});
