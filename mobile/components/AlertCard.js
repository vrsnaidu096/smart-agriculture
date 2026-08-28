import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, riskPalette, shadow } from '../theme';
import RiskBadge from './RiskBadge';

export default function AlertCard({ alert, onPress }) {
  const palette = riskPalette(alert.level);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: palette.dot }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={18} color={palette.dot} />
        <Text style={styles.title} numberOfLines={1}>{alert.title}</Text>
        <RiskBadge level={alert.level} size="sm" />
      </View>
      <Text style={styles.message} numberOfLines={3}>{alert.message}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { ...typography.bodySecondary, fontWeight: '700', color: colors.text, flex: 1 },
  message: { ...typography.bodySecondary, lineHeight: 20 }
});
