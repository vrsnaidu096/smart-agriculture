import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from './i18n';
import SplashScreenComponent from './app/splash';
import HomeScreen from './app/index';
import ScanScreen from './app/scan';
import PreviewScreen from './app/preview';
import AnalyzingScreen from './app/analyzing';
import ResultScreen from './app/result';
import RecommendationScreen from './app/recommendation';
import MapScreen from './app/map';
import HistoryScreen from './app/history';
import AlertsScreen from './app/alerts';
import SettingsScreen from './app/settings';
import BoundaryScreen from './app/boundary';
import LoginScreen from './app/login';

import * as SplashScreen from 'expo-splash-screen';
import { useFonts, RozhaOne_400Regular } from '@expo-google-fonts/rozha-one';
import {
  Mukta_300Light,
  Mukta_400Regular,
  Mukta_500Medium,
  Mukta_600SemiBold,
  Mukta_700Bold
} from '@expo-google-fonts/mukta';
import {
  NotoSansTelugu_300Light,
  NotoSansTelugu_400Regular,
  NotoSansTelugu_500Medium,
  NotoSansTelugu_600SemiBold,
  NotoSansTelugu_700Bold
} from '@expo-google-fonts/noto-sans-telugu';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Keep the native splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

/**
 * A single stack with headers hidden: every screen renders its own header
 * (ScreenHeader) and, where relevant, the custom BottomTabBar. That keeps the
 * raised centre camera button possible without a tab navigator.
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    RozhaOne_400Regular,
    Mukta_300Light,
    Mukta_400Regular,
    Mukta_500Medium,
    Mukta_600SemiBold,
    Mukta_700Bold,
    NotoSansTelugu_300Light,
    NotoSansTelugu_400Regular,
    NotoSansTelugu_500Medium,
    NotoSansTelugu_600SemiBold,
    NotoSansTelugu_700Bold
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{ headerShown: false, animation: 'fade' }}
          >
            <Stack.Screen name="Splash" component={SplashScreenComponent} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="Preview" component={PreviewScreen} />
            <Stack.Screen
              name="Analyzing"
              component={AnalyzingScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="Recommendation" component={RecommendationScreen} />
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="Boundary" component={BoundaryScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Alerts" component={AlertsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </I18nProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
