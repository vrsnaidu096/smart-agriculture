import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { useTranslation } from '../i18n';

export default function LoadingState({ message, style }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message || t('loading')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  text: { ...typography.bodySecondary, marginTop: spacing.md }
});
