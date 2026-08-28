import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, shadow } from '../theme';
import { useTranslation } from '../i18n';

/**
 * Custom tab bar with a raised centre camera button.
 *
 * Hand-rolled rather than @react-navigation/bottom-tabs: the raised centre
 * action is awkward to achieve with the stock navigator, and this avoids
 * adding a dependency for one component.
 */
export default function BottomTabBar({ active, navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const tabs = [
    { key: 'Home', icon: 'home', label: t('nav_home') },
    { key: 'Scan', icon: 'scan-outline', label: t('nav_scan') },
    { key: 'Camera', icon: 'camera', label: '', centre: true },
    { key: 'History', icon: 'time-outline', label: t('nav_history') },
    { key: 'Settings', icon: 'person-outline', label: t('nav_profile') }
  ];

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;

        if (tab.centre) {
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.centreButton}
              onPress={() => navigation.navigate('Scan')}
              activeOpacity={0.85}
              accessibilityLabel={t('analyze_my_crop')}
            >
              <Ionicons name="camera" size={26} color={colors.white} />
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={21}
              color={isActive ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    ...Platform.select({ ios: shadow.card, android: {} })
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs, gap: 2 },
  label: { ...typography.caption, fontSize: 11 },
  labelActive: { color: colors.primary, fontWeight: '700' },
  centreButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 4,
    borderColor: colors.surface,
    ...shadow.raised
  }
});
