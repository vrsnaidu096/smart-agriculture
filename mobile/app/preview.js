import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';

const CROPS = [
  { key: 'Rice', labelKey: 'rice' },
  { key: 'Sugarcane', labelKey: 'sugarcane' }
];

export default function PreviewScreen({ navigation, route }) {
  const { t } = useTranslation();
  const photos = route.params?.photos ?? [];
  const [crop, setCrop] = useState('Rice');
  const [activeIndex, setActiveIndex] = useState(0);

  const hero = photos[activeIndex];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={t('preview')}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {hero ? (
          <Image source={{ uri: hero.uri }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroEmpty]}>
            <Ionicons name="image-outline" size={38} color={colors.textMuted} />
          </View>
        )}

        {photos.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
            {photos.map((photo, index) => (
              <TouchableOpacity key={index} onPress={() => setActiveIndex(index)} activeOpacity={0.8}>
                <Image
                  source={{ uri: photo.uri }}
                  style={[styles.thumb, index === activeIndex && styles.thumbActive]}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <Text style={styles.label}>{t('crop_type')}</Text>
        <View style={styles.cropRow}>
          {CROPS.map((option) => {
            const selected = crop === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.cropChip, selected && styles.cropChipActive]}
                onPress={() => setCrop(option.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.cropText, selected && styles.cropTextActive]}>
                  {t(option.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.retake} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.retakeText}>{t('retake')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.analyze, photos.length === 0 && styles.analyzeDisabled]}
          disabled={photos.length === 0}
          onPress={() => navigation.navigate('Analyzing', { photos, crop })}
          activeOpacity={0.85}
        >
          <Text style={styles.analyzeText}>{t('analyze_crop')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: { width: '100%', height: 300, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  heroEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: colors.primary },
  label: { ...typography.bodySecondary, fontWeight: '600' },
  cropRow: { flexDirection: 'row', gap: spacing.md },
  cropChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center'
  },
  cropChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  cropText: { ...typography.body, fontWeight: '600', color: colors.textSecondary },
  cropTextActive: { color: colors.primary },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  retake: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  retakeText: { ...typography.body, fontWeight: '700', color: colors.textSecondary },
  analyze: {
    flex: 2,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center'
  },
  analyzeDisabled: { opacity: 0.5 },
  analyzeText: { ...typography.button }
});
