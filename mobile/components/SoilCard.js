import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import { colors, spacing, typography } from '../theme';
import { useTranslation } from '../i18n';

const Metric = ({ label, value }) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>{value ?? '--'}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

export default function SoilCard({ soil }) {
  const { t } = useTranslation();
  const available = soil && soil.status === 'OK';

  return (
    <Card>
      <Text style={styles.title}>{t('soil_conditions')}</Text>
      {available ? (
        <View style={styles.row}>
          <Metric label="pH" value={soil.ph != null ? soil.ph.toFixed(1) : null} />
          <Metric
            label="Organic C"
            value={soil.organicCarbon != null ? `${soil.organicCarbon.toFixed(1)}` : null}
          />
          <Metric label="Type" value={soil.soilType || null} />
        </View>
      ) : (
        <Text style={styles.unavailable}>{t('status_unavailable')}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.subheading, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { ...typography.subheading, color: colors.text },
  metricLabel: { ...typography.caption, marginTop: 2 },
  unavailable: { ...typography.bodySecondary }
});
