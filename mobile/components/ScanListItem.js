import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, riskPalette } from '../theme';
import RiskBadge from './RiskBadge';
import { useTranslation } from '../i18n';

const NON_DISEASE = ['NOT_A_CROP', 'REJECTED', 'UNAVAILABLE'];

/** Formats a stored timestamp as "Today, 10:30 AM" style text. */
const formatWhen = (iso) => {
  if (!iso) return '';
  // SQLite writes "YYYY-MM-DD HH:MM:SS" in UTC; make it explicit for Date.
  const date = new Date(String(iso).replace(' ', 'T') + (String(iso).endsWith('Z') ? '' : 'Z'));
  if (Number.isNaN(date.getTime())) return String(iso);

  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return `Today, ${time}`;

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;

  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
};

export default function ScanListItem({ scan, onPress, showDivider = true }) {
  const { t } = useTranslation();
  const palette = riskPalette(scan.riskLevel);

  const isDisease = scan.disease && !NON_DISEASE.includes(scan.disease);
  const title = isDisease ? scan.disease : t('photo_unclear');
  const subtitle = isDisease
    ? `${t('possible')} ${scan.disease}`
    : scan.disease === 'NOT_A_CROP' || scan.disease === 'REJECTED'
      ? t('not_a_crop')
      : t('service_unavailable');

  return (
    <TouchableOpacity
      style={[styles.row, showDivider && styles.divider]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={[styles.thumb, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Ionicons name="leaf" size={22} color={palette.dot} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        <Text style={styles.when}>{formatWhen(scan.createdAt)}</Text>
      </View>

      {scan.riskLevel ? <RiskBadge level={scan.riskLevel} size="sm" /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  body: { flex: 1 },
  title: { ...typography.bodySecondary, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  when: { ...typography.caption, marginTop: 2 }
});
