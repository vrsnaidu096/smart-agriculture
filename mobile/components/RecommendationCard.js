import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import { colors, spacing, typography } from '../theme';
import { useTranslation } from '../i18n';

/**
 * Splits the backend's recommendation string into readable bullets.
 * The safety validator appends "[SAFETY WARNING]: ..." to a recommendation, so
 * that clause is pulled out and shown as its own highlighted line.
 */
export const splitRecommendation = (text) => {
  if (!text) return { actions: [], warning: null };
  const [main, ...rest] = String(text).split('[SAFETY WARNING]:');
  const warning = rest.length ? rest.join(' ').trim() : null;
  const actions = main
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { actions, warning };
};

export default function RecommendationCard({ recommendation, extras = [] }) {
  const { t } = useTranslation();
  const { actions, warning } = splitRecommendation(recommendation);
  const bullets = [...actions, ...extras];

  return (
    <Card>
      <Text style={styles.title}>{t('what_you_should_do')}</Text>

      {bullets.length === 0 ? (
        <Text style={styles.body}>{t('error_generic')}</Text>
      ) : (
        bullets.map((line, index) => (
          <View key={index} style={styles.bullet}>
            <View style={styles.dot} />
            <Text style={styles.bulletText}>{line}</Text>
          </View>
        ))
      )}

      {warning ? (
        <View style={styles.warning}>
          <Ionicons name="alert-circle" size={16} color={colors.risk.MEDIUM.fg} />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.subheading, marginBottom: spacing.md },
  body: { ...typography.bodySecondary },
  bullet: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  bulletText: { ...typography.body, flex: 1, lineHeight: 21 },
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.risk.MEDIUM.bg,
    borderWidth: 1,
    borderColor: colors.risk.MEDIUM.border,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.sm
  },
  warningText: { ...typography.bodySecondary, color: colors.risk.MEDIUM.fg, flex: 1, lineHeight: 19 }
});
