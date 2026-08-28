import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '../theme';

/**
 * Progress ring for the dashboard's Farm Health figure.
 * Colour tracks the score so the ring reads at a glance without the number.
 */
export default function HealthRing({ score, size = 64, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const hasScore = typeof score === 'number' && Number.isFinite(score);
  const clamped = hasScore ? Math.max(0, Math.min(100, score)) : 0;
  const dash = (clamped / 100) * circumference;

  const stroke =
    !hasScore ? colors.border
      : clamped >= 80 ? colors.risk.LOW.dot
      : clamped >= 50 ? colors.risk.MEDIUM.dot
      : colors.risk.HIGH.dot;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          // Start the arc at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.centre, { width: size, height: size }]}>
        <Text style={styles.value}>{hasScore ? `${clamped}%` : '--'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  value: { ...typography.bodySecondary, fontWeight: '700', color: colors.text, fontSize: 13 }
});
