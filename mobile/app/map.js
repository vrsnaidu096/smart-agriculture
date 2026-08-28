import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import FarmMapView, { MapLegend } from '../components/FarmMapView';
import LoadingState from '../components/LoadingState';
import RiskBadge from '../components/RiskBadge';
import BottomTabBar from '../components/BottomTabBar';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';
import { getMapData } from '../services/api';
import { getActiveFarmId } from '../services/storage';

export default function MapScreen({ navigation }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const farmId = await getActiveFarmId();
    const result = await getMapData(farmId);
    if (result.ok) setData(result.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={t('map_title')}
        onBack={() => navigation.navigate('Home')}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('Boundary')}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
        >
          <FarmMapView
            boundary={data?.boundary}
            markers={data?.markers ?? []}
            zones={data?.zones ?? []}
          />

          <Card>
            <MapLegend />
          </Card>

          {data?.zones?.length ? (
            <Card>
              <Text style={styles.sectionTitle}>
                {t('monitoring_zone')} ({data.zones.length})
              </Text>
              {data.zones.map((zone, index) => (
                <View
                  key={zone.id}
                  style={[styles.zoneRow, index < data.zones.length - 1 && styles.zoneDivider]}
                >
                  <View style={[styles.zoneDot, { backgroundColor: colors.zone[zone.type] }]} />
                  <View style={styles.zoneBody}>
                    <Text style={styles.zoneTitle}>
                      {zone.diseases.length ? zone.diseases.join(', ') : t('scan_location')}
                    </Text>
                    <Text style={styles.zoneMeta}>
                      {zone.scanCount} {zone.scanCount === 1 ? 'scan' : 'scans'}
                    </Text>
                  </View>
                  <RiskBadge level={zone.riskLevel} size="sm" />
                </View>
              ))}
            </Card>
          ) : null}

          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => navigation.navigate('Boundary')}
            activeOpacity={0.85}
          >
            <Ionicons name="walk-outline" size={18} color={colors.white} />
            <Text style={styles.mapButtonText}>
              {data?.boundary ? t('map_farm') : t('start_mapping')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <BottomTabBar active="Map" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: { ...typography.subheading, marginBottom: spacing.md },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  zoneDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  zoneDot: { width: 12, height: 12, borderRadius: 6 },
  zoneBody: { flex: 1 },
  zoneTitle: { ...typography.bodySecondary, fontWeight: '600', color: colors.text },
  zoneMeta: { ...typography.caption, marginTop: 1 },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md
  },
  mapButtonText: { ...typography.button }
});
