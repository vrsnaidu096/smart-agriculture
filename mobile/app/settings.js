import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import BottomTabBar from '../components/BottomTabBar';
import BrandMark from '../components/BrandMark';
import BrandLockup from '../components/BrandLockup';
import { colors, spacing, radius, useAppTypography, riskPalette } from '../theme';
import { useTranslation, LANGUAGES } from '../i18n';
import { listFarms } from '../services/api';
import { getActiveFarmId, setActiveFarmId, getFarmerName } from '../services/storage';

const Row = ({ icon, label, value, onPress, danger, typography }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
    <Ionicons name={icon} size={19} color={danger ? colors.risk.HIGH.fg : colors.textSecondary} />
    <Text style={[styles.rowLabel, typography.body, danger && { color: colors.risk.HIGH.fg }]}>{label}</Text>
    {value ? <Text style={[styles.rowValue, typography.bodySecondary]}>{value}</Text> : null}
    {onPress ? <Ionicons name="chevron-forward" size={17} color={colors.textMuted} /> : null}
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const { t, language, setLanguage } = useTranslation();
  const typography = useAppTypography();
  const [farms, setFarms] = useState([]);
  const [activeFarm, setActive] = useState(1);
  const [farmerName, setName] = useState(null);
  const [showLanguages, setShowLanguages] = useState(false);

  const load = useCallback(async () => {
    setActive(await getActiveFarmId());
    setName(await getFarmerName());
    const result = await listFarms();
    if (result.ok) setFarms(result.data.farms);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const chooseFarm = async (farmId) => {
    setActive(farmId);
    await setActiveFarmId(farmId);
  };

  const currentLanguage = LANGUAGES.find((l) => l.code === language);

  const riskGuide = [
    { level: 'LOW', key: 'risk_guide_low', icon: 'shield-checkmark' },
    { level: 'MEDIUM', key: 'risk_guide_medium', icon: 'alert-circle' },
    { level: 'HIGH', key: 'risk_guide_high', icon: 'warning' }
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('profile')} onBack={() => navigation.navigate('Home')} />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <BrandMark size={72} />
          <Text style={[styles.profileName, typography.subheading]}>{farmerName || t('farmer')}</Text>
          <Text style={[styles.profileSub, typography.caption]}>{t('tagline')}</Text>
        </Card>

        <Card padded={false}>
          <Text style={[styles.groupTitle, typography.caption]}>{t('my_farms')}</Text>
          {farms.length === 0 ? (
            <Text style={[styles.emptyFarms, typography.bodySecondary]}>{t('loading')}</Text>
          ) : (
            farms.map((farm) => (
              <TouchableOpacity
                key={farm.id}
                style={styles.row}
                onPress={() => chooseFarm(farm.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={activeFarm === farm.id ? 'radio-button-on' : 'radio-button-off'}
                  size={19}
                  color={activeFarm === farm.id ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.rowLabel, typography.body]}>{farm.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </Card>

        <Card padded={false}>
          <Text style={[styles.groupTitle, typography.caption]}>{t('settings')}</Text>
          <Row
            icon="language-outline"
            label={t('language')}
            value={currentLanguage?.nativeLabel}
            onPress={() => setShowLanguages((v) => !v)}
            typography={typography}
          />
          {showLanguages
            ? LANGUAGES.map((option) => (
                <TouchableOpacity
                  key={option.code}
                  style={[styles.row, styles.subRow]}
                  onPress={() => { setLanguage(option.code); setShowLanguages(false); }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={language === option.code ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={language === option.code ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.rowLabel, typography.body]}>{option.nativeLabel}</Text>
                  <Text style={[styles.rowValue, typography.bodySecondary]}>{option.label}</Text>
                </TouchableOpacity>
              ))
            : null}
          <Row icon="map-outline" label={t('farm_map')} onPress={() => navigation.navigate('Map')} typography={typography} />
          <Row icon="help-circle-outline" label={t('help_support')} typography={typography} />
          <Row icon="information-circle-outline" label={t('about_us')} typography={typography} />
        </Card>

        <Card>
          <Text style={[styles.groupTitleInline, typography.subheading]}>{t('risk_guide')}</Text>
          {riskGuide.map((item) => {
            const palette = riskPalette(item.level);
            return (
              <View
                key={item.level}
                style={[styles.guideRow, { backgroundColor: palette.bg, borderColor: palette.border }]}
              >
                <Ionicons name={item.icon} size={20} color={palette.dot} />
                <View style={styles.guideBody}>
                  <Text style={[styles.guideLevel, { color: palette.fg }]}>
                    {t(`risk_${item.level.toLowerCase()}`)}
                  </Text>
                  <Text style={[styles.guideText, typography.bodySecondary]}>{t(item.key)}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <BrandLockup orientation="vertical" size={80} animated={false} />
          <Text style={{ marginTop: spacing.md, ...typography.caption, color: colors.textMuted, textAlign: 'center' }}>
            जय जवान जय किसान — Lal Bahadur Shastri, 1965
          </Text>
        </Card>
      </ScrollView>

      <BottomTabBar active="Settings" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  profileCard: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  profileName: { },
  profileSub: { },
  groupTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm
  },
  groupTitleInline: { marginBottom: spacing.md },
  emptyFarms: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  subRow: { paddingLeft: spacing.xxl, backgroundColor: colors.surfaceAlt },
  rowLabel: { flex: 1 },
  rowValue: { },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  guideBody: { flex: 1 },
  guideLevel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  guideText: { marginTop: 2, lineHeight: 19 }
});
