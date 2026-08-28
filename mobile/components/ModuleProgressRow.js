import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';

/**
 * One intelligence module on the Analyzing screen.
 *
 * This is the farmer-visible face of the parallel orchestrator: each module
 * reports its own state rather than the app showing a single opaque spinner.
 */
export default function ModuleProgressRow({ icon, label, status }) {
  const { t } = useTranslation();

  const config = {
    pending: { color: colors.textMuted, bg: colors.surfaceAlt, text: t('status_pending') },
    processing: { color: colors.risk.MEDIUM.fg, bg: colors.risk.MEDIUM.bg, text: t('status_processing') },
    completed: { color: colors.primary, bg: colors.primarySoft, text: t('status_completed') },
    unavailable: { color: colors.textSecondary, bg: colors.surfaceAlt, text: t('status_unavailable') }
  }[status] || { color: colors.textMuted, bg: colors.surfaceAlt, text: t('status_pending') };

  return (
    <View style={[styles.row, { backgroundColor: config.bg }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={16} color={config.color} />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.status, { color: config.color }]}>{config.text}</Text>
      </View>

      {status === 'processing' ? (
        <ActivityIndicator size="small" color={config.color} />
      ) : status === 'completed' ? (
        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
      ) : status === 'unavailable' ? (
        <Ionicons name="remove-circle-outline" size={20} color={colors.textMuted} />
      ) : (
        <Ionicons name="ellipse-outline" size={18} color={colors.textMuted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    gap: spacing.md
  },
  iconBox: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  textBlock: { flex: 1 },
  label: { ...typography.bodySecondary, fontWeight: '600', color: colors.text },
  status: { fontSize: 12, fontWeight: '600', marginTop: 1 }
});
