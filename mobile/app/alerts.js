import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import ScreenHeader from '../components/ScreenHeader';
import AlertCard from '../components/AlertCard';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { colors, spacing } from '../theme';
import { useTranslation } from '../i18n';
import { getAlerts } from '../services/api';
import { getActiveFarmId } from '../services/storage';

export default function AlertsScreen({ navigation }) {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const farmId = await getActiveFarmId();
    const result = await getAlerts(farmId);
    if (result.ok) setAlerts(result.data.alerts);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={t('alerts')}
        subtitle={alerts.length ? `${alerts.length}` : undefined}
        onBack={() => navigation.navigate('Home')}
      />

      {loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={alerts.length === 0 ? styles.emptyContent : styles.content}
          renderItem={({ item }) => (
            <AlertCard alert={item} onPress={() => navigation.navigate('Map')} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-circle-outline"
              title={t('no_alerts')}
              detail={t('no_alerts_detail')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  emptyContent: { flexGrow: 1, justifyContent: 'center' }
});
