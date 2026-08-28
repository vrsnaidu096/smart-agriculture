import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import { colors, spacing, typography } from '../theme';
import { useTranslation } from '../i18n';

const iconFor = (weather) => {
  if (!weather || weather.status !== 'OK') return 'cloud-offline-outline';
  if (weather.rainExpected) return 'rainy';
  if ((weather.humidity ?? 0) > 80) return 'cloudy';
  return 'partly-sunny';
};

export default function WeatherCard({ weather, compact = false }) {
  const { t } = useTranslation();
  const available = weather && weather.status === 'OK';

  return (
    <Card>
      <Text style={styles.label}>{t('weather')}</Text>

      {available ? (
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={styles.temp}>
              {weather.temperature != null ? Math.round(weather.temperature) : '--'}
              <Text style={styles.unit}>°C</Text>
            </Text>
            <Text style={styles.detail}>
              {t('humidity')} {weather.humidity != null ? `${weather.humidity}%` : '--'}
            </Text>
            <Text style={styles.detail}>
              {weather.rainExpected ? t('rain_expected') : t('no_rain_expected')}
            </Text>
          </View>
          <Ionicons name={iconFor(weather)} size={compact ? 40 : 48} color={colors.textSecondary} />
        </View>
      ) : (
        <View style={styles.row}>
          <Text style={styles.unavailable}>{t('weather_unavailable')}</Text>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.bodySecondary, fontWeight: '600', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flex: 1 },
  temp: { fontSize: 34, fontWeight: '700', color: colors.text },
  unit: { fontSize: 18, fontWeight: '600', color: colors.textSecondary },
  detail: { ...typography.bodySecondary, marginTop: 2 },
  unavailable: { ...typography.bodySecondary, flex: 1 }
});
