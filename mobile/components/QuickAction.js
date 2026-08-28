import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../theme';

/** One tile in the Quick Actions grid. `primary` gives the filled green style. */
export default function QuickAction({ icon, label, onPress, primary = false, badge }) {
  return (
    <TouchableOpacity
      style={[styles.tile, primary ? styles.primary : styles.secondary]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.iconBox, primary ? styles.iconBoxPrimary : styles.iconBoxSecondary]}>
        <Ionicons name={icon} size={20} color={primary ? colors.primary : colors.primary} />
        {badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, primary && styles.labelPrimary]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 74,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.card
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBoxPrimary: { backgroundColor: colors.white },
  iconBoxSecondary: { backgroundColor: colors.primarySoft },
  label: { ...typography.bodySecondary, fontWeight: '600', color: colors.text, flex: 1 },
  labelPrimary: { color: colors.white },
  badge: {
    position: 'absolute',
    top: -5,
    right: -6,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.risk.HIGH.dot,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' }
});
