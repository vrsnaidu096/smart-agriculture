import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import BrandLockup from '../components/BrandLockup';
import { brand } from '../theme';
import { getFarmSummary } from '../services/api';
import { getActiveFarmId } from '../services/storage';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    let isMounted = true;
    
    const boot = async () => {
      const start = Date.now();
      
      try {
        const farmId = await getActiveFarmId();
        await getFarmSummary(farmId);
      } catch (e) {
        console.warn('Splash prefetch failed, continuing to Home anyway.', e);
      }
      
      const elapsed = Date.now() - start;
      const remaining = 1600 - elapsed;
      
      if (remaining > 0) {
        await new Promise(r => setTimeout(r, remaining));
      }
      
      if (isMounted) {
        // Use replace so we don't leave splash in the back stack
        navigation.replace('Home');
      }
    };
    
    boot();
    
    return () => {
      isMounted = false;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <BrandLockup orientation="vertical" size={120} animated={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.neelDeep,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
