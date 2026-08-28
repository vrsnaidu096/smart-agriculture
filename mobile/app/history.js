import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import ScreenHeader from '../components/ScreenHeader';
import ScanListItem from '../components/ScanListItem';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import BottomTabBar from '../components/BottomTabBar';
import { colors, spacing } from '../theme';
import { useTranslation } from '../i18n';
import { getHistory } from '../services/api';
import { getActiveFarmId } from '../services/storage';

const PAGE = 20;

export default function HistoryScreen({ navigation }) {
  const { t } = useTranslation();
  const [scans, setScans] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (offset = 0) => {
    const farmId = await getActiveFarmId();
    const result = await getHistory(farmId, PAGE, offset);

    if (result.ok) {
      setTotal(result.data.total);
      setScans((current) => (offset === 0 ? result.data.scans : [...current, ...result.data.scans]));
    }
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, []);

  useFocusEffect(useCallback(() => { load(0); }, [load]));

  const loadMore = () => {
    if (loadingMore || scans.length >= total) return;
    setLoadingMore(true);
    load(scans.length);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title={t('scan_history')} onBack={() => navigation.navigate('Home')} />
        <LoadingState />
        <BottomTabBar active="History" navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={t('scan_history')}
        subtitle={total > 0 ? `${total} ${total === 1 ? 'scan' : 'scans'}` : undefined}
        onBack={() => navigation.navigate('Home')}
      />

      <FlatList
        data={scans}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={scans.length === 0 ? styles.emptyContent : styles.content}
        renderItem={({ item, index }) => (
          <ScanListItem scan={item} showDivider={index < scans.length - 1} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(0); }}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title={t('no_history')}
            detail={t('no_history_detail')}
            actionLabel={t('analyze_my_crop')}
            onAction={() => navigation.navigate('Scan')}
          />
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null
        }
      />

      <BottomTabBar active="History" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  footer: { paddingVertical: spacing.lg }
});
