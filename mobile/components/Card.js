import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, typography, shadow } from '../theme';

/** White rounded surface used for every block on every screen. */
export default function Card({ children, style, onPress, padded = true }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.card, padded && styles.padded, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {children}
    </Wrapper>
  );
}

export function CardHeader({ title, action, onAction }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.action}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function SectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card
  },
  padded: { padding: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  title: { ...typography.subheading },
  action: { ...typography.bodySecondary, color: colors.primary, fontWeight: '600' },
  sectionTitle: {
    ...typography.heading,
    marginTop: spacing.xl,
    marginBottom: spacing.md
  }
});
