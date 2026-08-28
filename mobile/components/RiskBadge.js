import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, radius, riskPalette } from '../theme';
import { useTranslation } from '../i18n';

/** Coloured pill showing HIGH / MEDIUM / LOW, translated. */
export default function RiskBadge({ level, size = 'md', style }) {
  const { t } = useTranslation();
  const palette = riskPalette(level);

  const label = level
    ? t(`risk_${String(level).toLowerCase()}`)
    : t('status_unavailable');

  const small = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderColor: palette.border },
        small && styles.badgeSmall,
        style
      ]}
    >
      <Text style={[styles.text, { color: palette.fg }, small && styles.textSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  badgeSmall: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
  text: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  textSmall: { fontSize: 11 }
});
