import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import Card, { CardHeader } from '../components/Card';
import HealthRing from '../components/HealthRing';
import WeatherCard from '../components/WeatherCard';
import QuickAction from '../components/QuickAction';
import ScanListItem from '../components/ScanListItem';
import LoadingState from '../components/LoadingState';
import BottomTabBar from '../components/BottomTabBar';
import { colors, spacing, typography, radius } from '../theme';
import { useTranslation } from '../i18n';
import { getFarmSummary, getAlerts } from '../services/api';
import { getActiveFarmId, getFarmerName } from '../services/storage';

const greetingKey = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'greeting_morning';
  if (hour < 17) return 'greeting_afternoon';
  return 'greeting_evening';
};

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [alertCount, setAlertCount] = useState(0);
  const [farmerName, setName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const farmId = await getActiveFarmId();
    setName(await getFarmerName());

    const [summaryResult, alertsResult] = await Promise.all([
      getFarmSummary(farmId),
      getAlerts(farmId)
    ]);

    if (summaryResult.ok) {
      setSummary(summaryResult.data);
      setError(null);
    } else {
      setError(summaryResult.error.message);
    }
    if (alertsResult.ok) setAlertCount(alertsResult.data.count);

    setLoading(false);
    setRefreshing(false);
  }, []);

  // Refresh whenever the tab regains focus, so a new scan shows up immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const health = summary?.health;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>{t(greetingKey())},</Text>
            <Text style={styles.name}>{farmerName || t('farmer')}</Text>
          </View>

          <TouchableOpacity
            style={styles.bell}
            onPress={() => navigation.navigate('Alerts')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {alertCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{alertCount > 9 ? '9+' : alertCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <Card style={styles.farmSelector} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="leaf" size={17} color={colors.primary} />
          <Text style={styles.farmName} numberOfLines={1}>
            {summary?.farm?.name || t('my_farms')}
          </Text>
          <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
        </Card>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {error ? (
              <Card style={styles.errorCard}>
                <Ionicons name="cloud-offline-outline" size={18} color={colors.risk.HIGH.fg} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={onRefresh}>
                  <Text style={styles.retry}>{t('retry')}</Text>
                </TouchableOpacity>
              </Card>
            ) : null}

            <Card style={styles.healthCard}>
              <View style={styles.healthText}>
                <Text style={styles.healthLabel}>{t('farm_health')}</Text>
                <Text style={styles.healthStatus}>{health?.label || t('no_scans_yet')}</Text>
                <Text style={styles.healthDetail}>{health?.detail || ''}</Text>
              </View>
              <HealthRing score={health?.healthScore} />
            </Card>

            <WeatherCard weather={summary?.weather} />

            <Text style={styles.sectionTitle}>{t('quick_actions')}</Text>
            <View style={styles.actionsGrid}>
              <QuickAction
                icon="camera"
                label={t('analyze_my_crop')}
                primary
                onPress={() => navigation.navigate('Scan')}
              />
              <QuickAction icon="map-outline" label={t('farm_map')} onPress={() => navigation.navigate('Map')} />
            </View>
            <View style={styles.actionsGrid}>
              <QuickAction
                icon="notifications-outline"
                label={t('view_alerts')}
                badge={alertCount}
                onPress={() => navigation.navigate('Alerts')}
              />
              <QuickAction icon="time-outline" label={t('scan_history')} onPress={() => navigation.navigate('History')} />
            </View>

            <Card style={styles.recentCard}>
              <CardHeader
                title={t('recent_scans')}
                action={t('view_all')}
                onAction={() => navigation.navigate('History')}
              />
              {summary?.recentScans?.length ? (
                summary.recentScans.map((scan, index) => (
                  <ScanListItem
                    key={scan.id}
                    scan={scan}
                    showDivider={index < summary.recentScans.length - 1}
                    onPress={() => navigation.navigate('History')}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>{t('no_history_detail')}</Text>
              )}
            </Card>
          </>
        )}
      </ScrollView>

      <BottomTabBar active="Home" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { ...typography.bodySecondary },
  name: { ...typography.title, marginTop: 1 },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.risk.HIGH.dot,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bellBadgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  farmSelector: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  farmName: { ...typography.body, fontWeight: '600', flex: 1 },
  healthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  healthText: { flex: 1, paddingRight: spacing.md },
  healthLabel: { ...typography.bodySecondary, fontWeight: '600' },
  healthStatus: { ...typography.subheading, color: colors.primary, marginTop: 3 },
  healthDetail: { ...typography.caption, marginTop: 3 },
  sectionTitle: { ...typography.heading, marginTop: spacing.sm },
  actionsGrid: { flexDirection: 'row', gap: spacing.md },
  recentCard: { marginTop: spacing.sm },
  emptyText: { ...typography.bodySecondary, paddingVertical: spacing.md },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.risk.HIGH.bg,
    borderColor: colors.risk.HIGH.border
  },
  errorText: { ...typography.bodySecondary, color: colors.risk.HIGH.fg, flex: 1 },
  retry: { ...typography.bodySecondary, color: colors.risk.HIGH.fg, fontWeight: '700' }
});
